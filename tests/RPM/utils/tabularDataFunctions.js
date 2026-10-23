import { expect } from "@playwright/test";
const fs = require('fs');
const path = require('path');

async function createNewtabularData(page, title, description, onDatasetCreated = () => {}) {
    const tabularTile = page
        .locator('div[role="button"]')
        .filter({ has: page.locator('h3', { hasText: 'Tabular' }) });
    await expect(tabularTile).toBeVisible();
    await tabularTile.click();
    // Select the New tabular data element header and verify its visibility
    const headerElement = page.getByRole('heading', { name: /new tabular data/i });
    await expect(headerElement).toBeVisible();
    await page.locator('#Title').fill(title);
    await page.locator('#Description').fill(description);
    let datasetId;
    const rememberDatasetId = (id) => {
        const normalizedId = String(id ?? '');
        if (!/^[1-9]\d*$/.test(normalizedId) || datasetId === normalizedId) return;
        datasetId = normalizedId;
        onDatasetCreated(normalizedId);
    };
    const rememberIdFromUrl = (url) => {
        if (!url.includes('/dcm/edit/')) return;
        rememberDatasetId(new URL(url).searchParams.get('id'));
    };
    const navigationListener = (frame) => {
        if (frame === page.mainFrame()) rememberIdFromUrl(frame.url());
    };

    page.on('framenavigated', navigationListener);
    try {
        const createResponsePromise = page.waitForResponse((response) => {
            const responseUrl = new URL(response.url());
            return response.request().method() === 'POST' &&
                responseUrl.pathname.replace(/\/$/, '').toLowerCase() === '/dcm/create/create';
        });
        let createClickError;
        const [createResponse] = await Promise.all([
            createResponsePromise,
            page
                .locator('button[title="Create a new dataset and continue editing"]')
                .click({ noWaitAfter: true })
                .catch((error) => { createClickError = error; }),
        ]);

        expect(
            createResponse.ok(),
            `Dataset-create request failed: ${createResponse.status()}`
        ).toBeTruthy();
        const contentType = createResponse.headers()['content-type'] || '';
        expect(contentType, 'Dataset-create response was not JSON').toContain('application/json');
        let createResult;
        let responseBodyWasEvicted = false;
        try {
            createResult = await createResponse.json();
        } catch (error) {
            // Chromium can evict an XHR body from the DevTools protocol while
            // the application consumes that same JSON and immediately replaces
            // the document. Only this instrumentation race may fall back to the
            // resulting edit URL; JSON/HTTP/application errors still fail.
            const errorMessage = String(error);
            responseBodyWasEvicted =
                /Protocol error \(Network\.getResponseBody\): No resource with given identifier found/i
                    .test(errorMessage);
            if (!responseBodyWasEvicted) throw error;
        }

        if (!responseBodyWasEvicted) {
            expect(
                createResult?.success,
                `Dataset creation was rejected: ${JSON.stringify(createResult)}`
            ).toBe(true);
            rememberDatasetId(createResult.id);
            expect(datasetId, `No dataset id in create response for ${title}`).toBeTruthy();
        }
        if (createClickError) throw createClickError;

        await page.waitForURL('**/dcm/edit/**');
        const navigationId = new URL(page.url()).searchParams.get('id');
        expect(navigationId, `No dataset id in edit navigation for ${title}`).toMatch(/^[1-9]\d*$/);
        if (!responseBodyWasEvicted) {
            expect(
                navigationId,
                `Edit navigation id does not match the create response for ${title}`
            ).toBe(datasetId);
        }
        rememberIdFromUrl(page.url());
    } finally {
        page.off('framenavigated', navigationListener);
    }

    expect(datasetId, `No dataset id in URL for ${title}`).toBeTruthy();
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
    return datasetId;
}

async function uploadfiles(page){
    const removeButtons = page.locator('button[title="Remove file"]');
    const datasetId = Number(new URL(page.url()).searchParams.get('id'));
    expect(datasetId, 'Dataset id is missing from the edit URL').toBeGreaterThan(0);
    const getCachedFileCount = async () => await page.evaluate(async (id) => {
        const response = await fetch(`/dcm/fileupload/load?id=${id}&version=0`, {
            credentials: 'same-origin',
        });
        if (!response.ok) return -1;
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return -1;
        const model = await response.json();
        const files = model.fileUploader?.existingFiles ?? model.FileUploader?.ExistingFiles;
        return Array.isArray(files) ? files.length : -1;
    }, datasetId);

    // New datasets can inherit a stale per-user upload cache. Remove it and
    // verify the server state before uploading a uniquely named copy.
    await expect.poll(getCachedFileCount, {
        message: 'The server-side upload cache did not become readable',
        timeout: 15_000,
    }).toBeGreaterThanOrEqual(0);
    const initialCachedFileCount = await getCachedFileCount();
    if (initialCachedFileCount > 0) {
        await expect(removeButtons).toHaveCount(initialCachedFileCount, { timeout: 15_000 });
    }
    while (await removeButtons.count() > 0) {
        const previousCount = await removeButtons.count();
        const removeResponsePromise = page.waitForResponse((response) =>
            /\/dcm\/fileupload\/removefile(?:\?|$)/i.test(response.url()) &&
            response.request().method() !== 'GET'
        );
        const [removeResponse] = await Promise.all([
            removeResponsePromise,
            removeButtons.first().click(),
        ]);
        expect(removeResponse.ok(), `Remove-file request failed: ${removeResponse.status()}`).toBeTruthy();
        await expect.poll(async () => await removeButtons.count(), {
            message: 'The visible stale-file count did not decrease after a successful removal',
        }).toBeLessThan(previousCount);
    }
    await expect.poll(getCachedFileCount, {
        message: 'Stale CSV remained in the server-side upload cache',
        timeout: 15_000,
    }).toBe(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'File Upload', exact: true })).toBeVisible();

    const filePath = path.resolve(__dirname, '../../Date_and_time_formats.csv');
    const handle = page.locator('input[type="file"]').nth(0);
    const uploadFileName = `Date_and_time_formats-${Date.now()}.csv`;
    await failOnVisibleWebsiteErrorToasts(page);
    await startWebsiteErrorToastCapture(page);
    const uploadResponsePromise = page.waitForResponse((response) =>
        /\/dcm\/fileupload\/upload(?:\?|$)/i.test(response.url()) &&
        response.request().method() !== 'GET'
    );
    const [uploadResponse] = await Promise.all([
        uploadResponsePromise,
        handle.setInputFiles({
            name: uploadFileName,
            mimeType: 'text/csv',
            buffer: fs.readFileSync(filePath),
        }),
    ]);
    expect(uploadResponse.ok(), `File-upload request failed: ${uploadResponse.status()}`).toBeTruthy();
    await expect.poll(getCachedFileCount, {
        message: 'Uploaded CSV did not reach the server-side upload cache',
        timeout: 15_000,
    }).toBe(1);
    await expect(removeButtons).toHaveCount(1, { timeout: 15_000 });
    await failOnCapturedWebsiteErrorToasts(page);
    await failOnVisibleWebsiteErrorToasts(page);

    const dataStructureSelect = page.locator('#SelectDataStructure');
    const dataStructureOption = page
        .locator('.list-item:visible')
        .getByText(uploadFileName, { exact: true });

    // The upload is processed asynchronously. Re-open the select until the
    // uploaded file becomes an actual "create based on file" option.
    await expect.poll(async () => {
        await dataStructureSelect.click();
        await page.waitForTimeout(200);
        const matches = await dataStructureOption.count();
        if (matches === 0) await page.keyboard.press('Escape');
        return matches;
    }, { timeout: 30_000 }).toBeGreaterThan(0);

    await failOnCapturedWebsiteErrorToasts(page);
    await failOnVisibleWebsiteErrorToasts(page);
    const generatorOrigin = new URL(page.url()).origin;
    const generatorNavigationPromise = page.waitForURL((url) =>
        url.origin === generatorOrigin &&
        url.pathname.replace(/\/$/, '').toLowerCase() === '/rpm/datastructure/create' &&
        url.searchParams.get('entityId') === String(datasetId) &&
        url.searchParams.get('file') === uploadFileName
    , {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
    });
    await Promise.all([
        generatorNavigationPromise,
        dataStructureOption.first().click(),
    ]);
    await page.locator('body').waitFor({ state: 'attached' });
    await failOnVisibleWebsiteErrorToasts(page);
}

async function markingVariableData(page){

    await page.getByRole('button', { name: 'Reset' }).click();

    await page.waitForSelector('#delimeter');
    await page.locator('#delimeter').selectOption('44');

    await page.waitForSelector('#selectVar');
    const title = page.locator('#edit > #title > b');
    await expect(title).toHaveText('Mark at least Variable and Data');
    const rows = page.locator('table.table tbody tr');
    await rows.nth(0).locator('td').first().click();
    await page.locator('#selectVar').click()
    await rows.nth(1).locator('td').first().click();
    await page.locator('#selectData').click()
    await page.getByRole('button', { name: 'Save', exact: true }).click();
}

async function EnterTitleandDesc(page,title,desc){
    await page.waitForTimeout(500)
    // verify the primary key alert message
    const alertmsg = page.locator('.alert-message > p');
    await  page.waitForSelector('.alert-message > p');
    await expect(alertmsg).toHaveText('Please select a (combined) primary key.');
    await page.waitForTimeout(500)
    await page.locator('#title').fill(title);
    await page.locator('#description').fill(desc);
}

async function AssignDataTypeDisplayPattern(page,getindex,datatype,displaypattern){
    const index = getindex; // Ensure this has a valid value
    const setDesc = page.locator(`#description-${index}`);
    const setDataType = page.locator(`#dataType-${index}`);
    const setDisplayPattern = page.locator(`#displayPattern-${index}`);

    await expect(setDataType).toBeVisible();
    await setDesc.fill('this is test description');
    await setDataType.click();
    await setDataType.fill(datatype);
    const dataTypeOption = page
        .locator('.list-item .item')
        .filter({ hasText: new RegExp(`^\\s*${datatype}\\s*$`, 'i') });
    await expect(dataTypeOption).toBeVisible();
    await dataTypeOption.click();

    await setDisplayPattern.click();
    await setDisplayPattern.fill(displaypattern);
    const escapedPattern = displaypattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const displayPatternOption = page
        .locator('.list-item .item')
        .filter({ hasText: new RegExp(`^\\s*${escapedPattern}\\s*$`) });
    await expect(displayPatternOption).toBeVisible();
    await displayPatternOption.click();

}

async function markPrimaryandSave(page){

    await page.locator('input[title="Variable is not part of primary key"]').first().click();
    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click()

}


async function validatePrimaryandSucessSymbols(page, dataStructureTitle){
    await expect(page).toHaveURL(/\/dcm\/edit\/\?id=\d+/);
    await expect(page.getByRole('heading', { name: 'Data Structure', exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(`^${dataStructureTitle} \\(\\d+\\)$`))).toBeVisible();
    await expect(page.getByText('Defined', { exact: true })).toBeVisible();
}

async function replaceUploadFile(page) {
    const removeButtons = page.locator('button[title="Remove file"]');
    const datasetId = Number(new URL(page.url()).searchParams.get('id'));
    expect(datasetId, 'Dataset id is missing from the edit URL').toBeGreaterThan(0);
    await failOnCapturedWebsiteErrorToasts(page);
    await failOnVisibleWebsiteErrorToasts(page);

    const getCachedFileCount = async () => await page.evaluate(async (id) => {
        const response = await fetch(`/dcm/fileupload/load?id=${id}&version=0`, {
            credentials: 'same-origin',
        });
        if (!response.ok) return -1;
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return -1;
        const model = await response.json();
        const files = model.fileUploader?.existingFiles ?? model.FileUploader?.ExistingFiles;
        return Array.isArray(files) ? files.length : -1;
    }, datasetId);

    const removeAllFiles = async () => {
        while (await removeButtons.count() > 0) {
            const previousCount = await removeButtons.count();
            const removeResponsePromise = page.waitForResponse((response) =>
                /\/dcm\/fileupload\/removefile(?:\?|$)/i.test(response.url()) &&
                response.request().method() !== 'GET'
            );
            const [removeResponse] = await Promise.all([
                removeResponsePromise,
                removeButtons.first().click(),
            ]);
            expect(removeResponse.ok(), `Remove-file request failed: ${removeResponse.status()}`).toBeTruthy();
            await expect.poll(
                async () => await removeButtons.count(),
                { message: 'Uploaded file row was not removed' }
            ).toBeLessThan(previousCount);
        }
    };

    await removeAllFiles();
    await expect.poll(getCachedFileCount, {
        message: 'Removed CSV remained in the server-side upload cache',
        timeout: 15_000,
    }).toBe(0);
    await failOnCapturedWebsiteErrorToasts(page);
    await failOnVisibleWebsiteErrorToasts(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'File Upload', exact: true })).toBeVisible();
    await expect(removeButtons).toHaveCount(0);

    const filePath = path.resolve(__dirname, '../../Date_and_time_formats.csv');
    const uploadInput = page.locator('input[type="file"][accept=".csv"]').first();
    await expect(uploadInput).toBeAttached();
    const uploadFile = {
        name: `Date_and_time_formats-${Date.now()}.csv`,
        mimeType: 'text/csv',
        buffer: fs.readFileSync(filePath),
    };
    await failOnVisibleWebsiteErrorToasts(page);
    await startWebsiteErrorToastCapture(page);
    const uploadResponsePromise = page.waitForResponse((response) =>
        /\/dcm\/fileupload\/upload(?:\?|$)/i.test(response.url()) &&
        response.request().method() !== 'GET'
    );
    const [uploadResponse] = await Promise.all([
        uploadResponsePromise,
        uploadInput.setInputFiles(uploadFile),
    ]);
    expect(uploadResponse.ok(), `File-upload request failed: ${uploadResponse.status()}`).toBeTruthy();
    await expect.poll(getCachedFileCount, {
        message: 'Uploaded CSV did not reach the server-side upload cache',
        timeout: 15_000,
    }).toBe(1);
    await expect(removeButtons).toHaveCount(1, { timeout: 15_000 });
    await failOnCapturedWebsiteErrorToasts(page);
    await failOnVisibleWebsiteErrorToasts(page);
}

async function failOnVisibleWebsiteErrorToasts(page) {
    const websiteErrors = [];
    let visibleToastDetails = [];

    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            await page.waitForLoadState('domcontentloaded');
            await page.locator('body').waitFor({ state: 'attached' });
            visibleToastDetails = await page
                .locator('[data-testid="toast"]:visible')
                .evaluateAll((nodes) => nodes.map((node) => ({
                    text: (node.innerText || node.textContent || '').trim().replace(/\s+/g, ' '),
                    classes: [node, ...node.querySelectorAll('*')]
                        .map((element) => typeof element.className === 'string' ? element.className : '')
                        .join(' '),
                })));
            break;
        } catch (error) {
            const contextWasDestroyed =
                /Execution context was destroyed, most likely because of a navigation/i
                    .test(String(error));
            if (!contextWasDestroyed || attempt === 2) throw error;
        }
    }

    for (const toastDetails of visibleToastDetails) {
        const hasErrorText = /\b(?:error|exception|fehler|nre)\b|null\s*reference|object reference not set/i
            .test(toastDetails.text);
        const hasErrorStyle = /(?:^|\s)(?:variant-(?:filled|soft)-error|(?:bg|text|border)-error-\d+)(?:\s|$)/i
            .test(toastDetails.classes);

        if (hasErrorText || hasErrorStyle) {
            websiteErrors.push(toastDetails.text || '(error-styled toast without text)');
        }
    }

    if (websiteErrors.length > 0) {
        throw new Error('Website error toast detected:\n' + websiteErrors.join('\n'));
    }
}

async function startWebsiteErrorToastCapture(page) {
    await page.evaluate(() => {
        const captureKey = '__playwrightWebsiteErrorToasts';
        const observerKey = '__playwrightWebsiteErrorToastObserver';
        const errorText = /\b(?:error|exception|fehler|nre)\b|null\s*reference|object reference not set/i;
        const errorStyle = /(?:^|\s)(?:variant-(?:filled|soft)-error|(?:bg|text|border)-error-\d+)(?:\s|$)/i;

        window[observerKey]?.disconnect();
        window[captureKey] = [];
        const toastStates = new WeakMap();

        const isVisible = (node) => {
            if (!node.isConnected || node.getClientRects().length === 0) return false;
            const style = window.getComputedStyle(node);
            return style.display !== 'none' && style.visibility !== 'hidden';
        };
        const getErrorMessage = (node) => {
            const text = (node.innerText || node.textContent || '').trim().replace(/\s+/g, ' ');
            const classes = [node, ...node.querySelectorAll('*')]
                .map((element) => typeof element.className === 'string' ? element.className : '')
                .join(' ');
            if (!errorText.test(text) && !errorStyle.test(classes)) return null;
            return text || '(error-styled toast without text)';
        };
        const scan = (captureNewlyVisible) => {
            for (const node of document.querySelectorAll('[data-testid="toast"]')) {
                const visible = isVisible(node);
                const errorMessage = getErrorMessage(node);
                const previousState = toastStates.get(node);
                const becameVisible = visible && !previousState?.visible;
                const becameAnError = visible && errorMessage &&
                    previousState?.errorMessage !== errorMessage;

                if (
                    captureNewlyVisible &&
                    errorMessage &&
                    (becameVisible || becameAnError) &&
                    !window[captureKey].includes(errorMessage)
                ) {
                    window[captureKey].push(errorMessage);
                }

                toastStates.set(node, { visible, errorMessage });
            }
        };

        // Baseline existing toast nodes without treating old hidden/dismissed
        // errors as failures belonging to the operation that starts now.
        scan(false);
        const observer = new MutationObserver(() => scan(true));
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });
        window[observerKey] = observer;
    });
}

async function failOnCapturedWebsiteErrorToasts(page) {
    const websiteErrors = await page.evaluate(() =>
        [...(window.__playwrightWebsiteErrorToasts || [])]
    );
    if (websiteErrors.length > 0) {
        throw new Error('Website error toast detected:\n' + websiteErrors.join('\n'));
    }
}

async function submitData(page, datasetId){
    const startButton = page.getByRole('button', {
        name: 'Start add/update rows of tabular data',
        exact: true,
    });
    await expect(startButton).toBeEnabled({ timeout: 30_000 });
    await startButton.click();

    const submitModal = page
        .locator('[data-testid="modal"]:visible')
        .filter({
            has: page.getByRole('button', { name: 'Confirm', exact: true }),
        })
        .filter({
            hasText: /Start add\/update rows|submit the data|Editing will be disabled/i,
        });
    await expect(submitModal).toHaveCount(1);
    await expect(submitModal).toBeVisible();
    await expect(
        submitModal.getByText('Start add/update rows of tabular data', { exact: true })
    ).toBeVisible();
    // Capture even short-lived server/UI errors while the asynchronous import runs.
    await failOnCapturedWebsiteErrorToasts(page);
    await failOnVisibleWebsiteErrorToasts(page);
    await startWebsiteErrorToastCapture(page);
    const submitResponsePromise = page.waitForResponse((response) =>
        response.request().method() === 'POST' &&
        /\/dcm\/submit\/submit(?:\?|$)/i.test(response.url())
    ).then(async (response) => {
        expect(response.ok(), `Submit request failed: ${response.status()}`).toBeTruthy();
        const contentType = response.headers()['content-type'] || '';
        expect(contentType, 'Submit response was not JSON').toContain('application/json');
        return {
            response,
            result: await response.json(),
        };
    });
    const [{ result: submitResult }] = await Promise.all([
        submitResponsePromise,
        submitModal.getByRole('button', { name: 'Confirm', exact: true }).click(),
    ]);
    await expect(submitModal).toBeHidden();

    expect(
        submitResult.success,
        `Tabular import rejected: ${JSON.stringify(submitResult.errors || submitResult)}`
    ).toBe(true);
    await failOnCapturedWebsiteErrorToasts(page);
    await failOnVisibleWebsiteErrorToasts(page);

    // Newer DCM versions show a second informational dialog after the POST.
    // It acknowledges the successful start only and must never replace the
    // resource-specific Confirm dialog above.
    const infoModal = page
        .locator('[data-testid="modal"]:visible')
        .filter({ hasText: /Import started|Editing will be disabled/i })
        .filter({ has: page.getByRole('button', { name: /^Ok$/i }) });
    const infoAppeared = await infoModal
        .first()
        .waitFor({ state: 'visible', timeout: 1_000 })
        .then(() => true)
        .catch(() => false);
    if (infoAppeared) {
        await expect(infoModal).toHaveCount(1);
        await infoModal.getByRole('button', { name: /^Ok$/i }).click();
        await expect(infoModal).toBeHidden();
    }

    const getRowCount = async () => await page.evaluate(async (id) => {
        const response = await fetch(`/sam/datasets/CountRows?id=${id}`, {
            credentials: 'same-origin',
        });
        if (!response.ok) return -1;
        return Number(await response.json());
    }, Number(datasetId));

    await expect.poll(getRowCount, {
        message: `Dataset ${datasetId} did not receive the three CSV data rows`,
        timeout: 90_000,
        intervals: [500, 1_000, 2_000, 5_000],
    }).toBe(3);
    await failOnCapturedWebsiteErrorToasts(page);
    await failOnVisibleWebsiteErrorToasts(page);

    const isSubmitModelAvailable = async () => await page.evaluate(async (id) => {
        const response = await fetch(`/dcm/submit/load?id=${id}`, {
            credentials: 'same-origin',
        });
        if (!response.ok) return false;
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return false;
        const model = await response.json();
        return Number(model.id) === id;
    }, Number(datasetId));

    await expect.poll(isSubmitModelAvailable, {
        message: `Submit model for dataset ${datasetId} did not become available after import`,
        timeout: 90_000,
        intervals: [500, 1_000, 2_000, 5_000],
    }).toBe(true);
    await failOnCapturedWebsiteErrorToasts(page);
    await failOnVisibleWebsiteErrorToasts(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Data', exact: true })).toBeVisible();
    await failOnVisibleWebsiteErrorToasts(page);
}
module.exports = {
    createNewtabularData,
    uploadfiles,
    markingVariableData,
    EnterTitleandDesc,
    AssignDataTypeDisplayPattern,
    markPrimaryandSave,
    validatePrimaryandSucessSymbols,
    replaceUploadFile,
    submitData

};
