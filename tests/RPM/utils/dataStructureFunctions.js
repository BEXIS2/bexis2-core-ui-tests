import { expect } from "@playwright/test";
import { assertNoVisibleWebsiteErrorToasts } from "./toastAssertions";

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const dataStructureRows = (page) => page.locator('[id^=datastructure-row-]');
const exactDataStructureRow = (page, dataStructure) =>
    dataStructureRows(page).filter({
        has: page.locator('[id^=datastructure-title-]').filter({
            hasText: new RegExp(`^\\s*${escapeRegExp(dataStructure)}\\s*$`),
        }),
    });

const fatalListErrorPattern =
    /NullReferenceException|Object reference not set to an instance of an object|Internal Server Error|HTTP Error 500|Application Error|An unhandled exception/i;
const websiteSuccessToastStylePattern =
    /(?:^|\s)(?:variant-(?:filled|soft)-success|(?:bg|text|border)-success-\d+)(?:\s|$)/i;

function validateDataStructureListModel(payload, context) {
    if (!Array.isArray(payload)) {
        throw new Error(`${context}: response JSON is not an array`);
    }

    const seenIds = new Set();
    return payload.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new Error(`${context}: item ${index} is not an object`);
        }
        if (!Number.isSafeInteger(item.id) || item.id <= 0) {
            throw new Error(`${context}: item ${index} has invalid id ${String(item.id)}`);
        }
        if (seenIds.has(item.id)) {
            throw new Error(`${context}: duplicate data-structure id ${item.id}`);
        }
        seenIds.add(item.id);
        if (typeof item.title !== 'string' || item.title.trim() === '') {
            throw new Error(`${context}: item ${item.id} has no valid title`);
        }
        if (item.description !== null && typeof item.description !== 'string') {
            throw new Error(`${context}: item ${item.id} has an invalid description`);
        }
        if (!Array.isArray(item.linkedTo) || item.linkedTo.some(
            (datasetId) => !Number.isSafeInteger(datasetId) || datasetId <= 0
        )) {
            throw new Error(`${context}: item ${item.id} has an invalid linkedTo list`);
        }

        return {
            id: item.id,
            title: item.title,
            description: item.description,
            linkedTo: item.linkedTo,
        };
    });
}

async function captureDataStructureListResponse(response, context) {
    if (!response.ok()) {
        throw new Error(
            `${context}: ${response.status()} ${response.statusText()}`
        );
    }

    const contentType = response.headers()['content-type'] || '';
    if (!/application\/json/i.test(contentType)) {
        throw new Error(`${context}: response is not JSON (${contentType || 'no content type'})`);
    }

    let payload;
    try {
        payload = await response.json();
    } catch (error) {
        throw new Error(`${context}: response JSON could not be read: ${String(error)}`);
    }

    return {
        model: validateDataStructureListModel(payload, context),
        response,
    };
}

async function readDataStructureDomSignature(page) {
    return await page.locator('body').evaluate((body) => {
        const isVisible = (element) => {
            const style = window.getComputedStyle(element);
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                element.getClientRects().length > 0;
        };
        const rows = Array.from(body.querySelectorAll('[id^=datastructure-row-]'))
            .filter(isVisible)
            .map((row) => ({
                id: row.id,
                title: row.querySelector('[id^=datastructure-title-]')?.textContent?.trim() ?? null,
            }));
        const noRows = Array.from(body.querySelectorAll('*')).some(
            (element) => element.textContent?.trim() === 'No rows available' && isVisible(element)
        );
        return JSON.stringify({ noRows, rows });
    });
}

async function assertRenderedDataStructuresMatchModel(page, model, context) {
    const expectedTitles = model.map((item) => item.title.trim());
    await expect.poll(
        async () => page.locator('body').evaluate((body, titles) => {
            const isVisible = (element) => {
                const style = window.getComputedStyle(element);
                return style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    element.getClientRects().length > 0;
            };
            const renderedTitles = Array.from(
                body.querySelectorAll('[id^=datastructure-row-]')
            )
                .filter(isVisible)
                .map((row) =>
                    row.querySelector('[id^=datastructure-title-]')?.textContent?.trim() ?? null
                );
            const noRows = Array.from(body.querySelectorAll('*')).some(
                (element) =>
                    element.textContent?.trim() === 'No rows available' && isVisible(element)
            );
            const paginationMatch = (body.innerText || '').match(
                /Displaying items\s+(\d+)\s*-\s*(\d+)\s+of\s+(\d+)/i
            );

            if (titles.length === 0) {
                if (renderedTitles.length !== 0 || !noRows) {
                    return `expected an empty rendered list, got ${JSON.stringify(renderedTitles)}`;
                }
                if (paginationMatch && Number(paginationMatch[3]) !== 0) {
                    return `empty response but paginator reports ${paginationMatch[3]} items`;
                }
                return null;
            }
            if (noRows) {
                return 'the empty-list marker is visible for a non-empty response';
            }

            let expectedRenderedTitles = titles;
            if (paginationMatch) {
                const start = Number(paginationMatch[1]);
                const end = Number(paginationMatch[2]);
                const total = Number(paginationMatch[3]);
                if (total !== titles.length) {
                    return `paginator reports ${total} items, response contains ${titles.length}`;
                }
                if (start < 1 || end < start || end > total) {
                    return `paginator has invalid range ${start}-${end} of ${total}`;
                }
                expectedRenderedTitles = titles.slice(start - 1, end);
            }

            if (renderedTitles.length !== expectedRenderedTitles.length) {
                return `rendered ${renderedTitles.length} titles, expected ` +
                    `${expectedRenderedTitles.length}: ${JSON.stringify(renderedTitles)}`;
            }
            for (let index = 0; index < expectedRenderedTitles.length; index += 1) {
                if (renderedTitles[index] !== expectedRenderedTitles[index]) {
                    return `rendered titles differ at index ${index}: ` +
                        `${JSON.stringify(renderedTitles)} !== ` +
                        `${JSON.stringify(expectedRenderedTitles)}`;
                }
            }
            return null;
        }, expectedTitles),
        { message: context, timeout: 15_000 }
    ).toBeNull();
}

async function waitForDataStructureListState(
    page,
    context,
    expectedState,
    dataStructure = '',
    previousSignature = ''
) {
    const result = await page.locator('body').evaluate(
        (
            body,
            {
                rowSelector,
                errorSource,
                errorFlags,
                expectedTitle,
                expectedState,
                previousSignature,
                timeout,
            }
        ) =>
            new Promise((resolve, reject) => {
                const errorPattern = new RegExp(errorSource, errorFlags);
                const isVisible = (element) => {
                    const style = window.getComputedStyle(element);
                    return style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        element.getClientRects().length > 0;
                };
                const readState = () => {
                    const bodyText = body.innerText || '';
                    const fatalError = bodyText.match(errorPattern);
                    if (fatalError) {
                        return { state: 'error', detail: fatalError[0] };
                    }

                    const loading = Array.from(
                        body.querySelectorAll(
                            '[aria-busy="true"], [data-testid*="loading" i], .loading, .spinner'
                        )
                    ).some(isVisible) || Array.from(body.querySelectorAll('*')).some(
                        (element) =>
                            /^loading(?:\.\.\.)?$/i.test(element.textContent?.trim() || '') &&
                            isVisible(element)
                    );
                    if (loading) return null;

                    const rows = Array.from(body.querySelectorAll(rowSelector)).filter(isVisible);
                    const noRows = Array.from(body.querySelectorAll('*')).some(
                        (element) =>
                            element.textContent?.trim() === 'No rows available' &&
                            isVisible(element)
                    );

                    if (rows.length > 0 && noRows) {
                        return {
                            state: 'error',
                            detail: 'rows and the empty-list marker are visible together',
                        };
                    }

                    let state;
                    if (expectedTitle) {
                        const exactRows = rows.filter((row) =>
                            row.querySelector('[id^=datastructure-title-]')?.textContent?.trim() ===
                            expectedTitle
                        );
                        if (exactRows.length > 1) {
                            return {
                                state: 'error',
                                detail: `multiple exact rows for "${expectedTitle}"`,
                            };
                        }
                        if (exactRows.length === 1) state = 'found';
                        else if (noRows && rows.length === 0) state = 'absent';
                        else return null;
                    } else {
                        if (rows.length > 0) state = 'populated';
                        else if (noRows) state = 'empty';
                        else return null;
                    }

                    const signature = JSON.stringify({
                        noRows,
                        rows: rows.map((row) => ({
                            id: row.id,
                            title: row.querySelector('[id^=datastructure-title-]')
                                ?.textContent?.trim() ?? null,
                        })),
                    });
                    if (previousSignature && signature === previousSignature) return null;
                    if (state !== expectedState) return null;
                    return { state };
                };

                let timer;
                const observer = new MutationObserver(() => finishIfReady());
                const finishIfReady = () => {
                    const state = readState();
                    if (!state) return;
                    window.clearTimeout(timer);
                    observer.disconnect();
                    resolve(state);
                };

                observer.observe(body, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                    attributes: true,
                    attributeFilter: ['aria-busy', 'class', 'hidden', 'style'],
                });
                timer = window.setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`Timed out waiting for ${expectedTitle || 'the list'}`));
                }, timeout);
                finishIfReady();
            }),
        {
            rowSelector: '[id^=datastructure-row-]',
            errorSource: fatalListErrorPattern.source,
            errorFlags: fatalListErrorPattern.flags,
            expectedTitle: dataStructure || '',
            expectedState,
            previousSignature,
            timeout: 15_000,
        }
    );

    if (result.state === 'error') {
        throw new Error(`${context}: ${result.detail}`);
    }
    return result.state;
}

async function searchDataStructure(page, dataStructure) {
    if (!page) {
        throw new Error(`Cannot search for data structure "${dataStructure}": page is unavailable`);
    }
    if (page.isClosed()) {
        throw new Error(`Cannot search for data structure "${dataStructure}": page is closed`);
    }

    const { model, state: freshState } = await navDataStructure(page);
    const row = exactDataStructureRow(page, dataStructure);
    const serverMatches = model.filter((item) => item.title === dataStructure);
    if (serverMatches.length > 1) {
        throw new Error(
            `Data-structure list response has multiple exact rows for "${dataStructure}"`
        );
    }

    if (freshState === 'empty') {
        await expect(row).toHaveCount(0);
        return row;
    }

    const initialMatches = await row.count();
    if (initialMatches > 1) {
        throw new Error(`Fresh data-structure list has multiple exact rows for "${dataStructure}"`);
    }
    if (initialMatches !== serverMatches.length && initialMatches > 0) {
        throw new Error(
            `Fresh DOM and list response disagree for data structure "${dataStructure}"`
        );
    }
    // If the exact row is already on the freshly loaded page, searching cannot
    // make selecting it safer and would only introduce another asynchronous race.
    if (initialMatches === 1) {
        return row;
    }

    const searchInput = page.locator('#datastructure-search');
    const searchButton = page.locator('#datastructure-searchSubmit');
    const previousSignature = await readDataStructureDomSignature(page);
    await searchInput.fill(dataStructure);
    await searchButton.click();
    await waitForDataStructureListState(
        page,
        `Data-structure search for "${dataStructure}" failed`,
        serverMatches.length === 1 ? 'found' : 'absent',
        dataStructure,
        previousSignature
    );
    await assertRenderedDataStructuresMatchModel(
        page,
        serverMatches,
        `Data-structure search for "${dataStructure}"`
    );
    if (serverMatches.length === 1) {
        await expect(row).toHaveCount(1);
    } else {
        await expect(row).toHaveCount(0);
    }
    return row;
}

async function confirmDataStructureDeletion(page, dataStructure) {
    const modal = page.locator('.modal:visible').filter({ hasText: dataStructure });
    await expect(modal).toHaveCount(1);
    await expect(modal).toBeVisible();
    await expect(modal.locator('.modal-header')).toContainText('Delete Structure');
    await expect(modal.locator('.modal-body')).toContainText(dataStructure);

    const confirmButton = modal.locator('.modal-footer button.variant-filled');
    await expect(confirmButton).toHaveCount(1);
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();
    await expect(modal).toBeHidden();
}

async function openDataStructureForm(page) {
    await expect(page.locator('#create')).toBeVisible();
    await page.locator('#create').click();
    const [response] = await Promise.all([
        page.waitForResponse(response =>
            new URL(response.url()).pathname.toLowerCase() === '/rpm/datastructure/empty'
            && response.request().method() === 'GET', { timeout: 20_000 }),
        page.click('button.btn.variant-filled-primary.grow'),
    ]);
    expect(response.ok(), `Loading the empty data structure failed: HTTP ${response.status()}`).toBe(true);
    await expect(page.locator('#title')).toBeVisible({ timeout: 20_000 });
}

async function checkDataStructure(page, hasTitle, hasDescription, hasPrimaryKey, hasOptionalValue, hasName, hasTitleDescription, hasDataType, hasUnit) {
    await openDataStructureForm(page);
    await page.getByRole('button', { name: 'Add variable', exact: true }).click();


    if (hasTitle) {
        // Fill in the title input
        await page.locator('input[id=title]').fill(hasTitle);
    }
    if (hasDescription) {
        // Fill in the title description input
        await page.locator('#description').fill('Test data structure');
    }
    if (hasPrimaryKey) {
        // Click on make a part of primary key 
        await page.locator('input[title="Variable is not part of primary key"]').click();
    }

    if (hasOptionalValue) {
        // Click on optional value
        await page.locator('input[title="Variable does not allow empty values"]').click();
    }

    if (hasName) {
        // Fill in the name input
        await page.locator('input[id=name-0]').fill(hasName);
    }

    if (hasTitleDescription) {
        // Fill in the title description textarea
        await page.locator('textarea[id=description-0]').fill('Test data structure');
    }

    if (hasDataType) {
        // Click the on data type dropdown
        await page.click('#dataType-0');
        await page.locator('.list-item:visible').getByText('Boolean', { exact: true }).click();
    }

    if (hasUnit) {
        // Click the on unit dropdown
        await page.click('input[id=unit-0]');
        await page.locator('.list-item:visible').getByText('none', { exact: true }).click();
    }

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
}

async function createDataStructure(page, titleName) {

    await openDataStructureForm(page);

    // Fill in the title input
    await page.locator('input[id=title]').fill(titleName);

    // Fill in the title description textarea
    await page.locator('#description').fill('Test data structure');

    await page.getByRole('button', { name: 'Add variable', exact: true }).click();

    // Click on to not make a part of primary key 
    // await page.locator('label:has(input[name="isKey"])').click();

    // Fill in the name input
    await page.locator('input[id=name-0]').fill(titleName);

    // Fill in the description textarea
    await page.locator('textarea[id=description-0]').fill('Test data structure');

    // Click the on data type dropdown
    const dataTypeInput = page.locator('#dataType-0');

    await dataTypeInput.click();
    await page.locator('.list-item:visible').getByText('Boolean', { exact: true }).click();

    // Click the on unit dropdown
    await page.click('input[id=unit-0]');
    await page.locator('.list-item:visible').getByText('none', { exact: true }).click();

    // marking the Primary key
    await page.locator('input[title="Variable is not part of primary key"]').click();

    // Click on save button
    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.locator('#datastructure-search')).toBeVisible();
}

async function findDataStructure(page, dataStructure) {
    const row = await searchDataStructure(page, dataStructure);
    await expect(row).toHaveCount(1);

    // Get the index of the data structure
    const id = await row.getAttribute('id');
    const index = id.split('-')[2];

    // Check the values
    await expect(page.locator(`#datastructure-title-${index}`)).toHaveText(dataStructure);
    await expect(page.locator(`#datastructure-description-${index}`)).toHaveText(
        'Test data structure'
    );
}

async function deleteDataStructure(page, dataStructure) {
    const row = await searchDataStructure(page, dataStructure);
    await expect(row).toHaveCount(1);
    await row.locator('[id^=delete-]').click();
    await confirmDataStructureDeletion(page, dataStructure);

}
async function checkAndCloseToast(page, dataStructure) {
    const expectedMessage = `Structure "${dataStructure}" deleted.`;
    const exactMessage = new RegExp(`^\\s*${escapeRegExp(expectedMessage)}\\s*$`);
    const visibleToasts = page.locator('.toast[data-testid="toast"]:visible');

    await expect.poll(
        async () => await visibleToasts.count(),
        { message: `No deletion toast appeared for data structure "${dataStructure}"` }
    ).toBeGreaterThan(0);
    await assertNoVisibleWebsiteErrorToasts(page);

    const toast = visibleToasts.filter({
        has: page.locator('.text-base').filter({ hasText: exactMessage }),
    });
    await expect(toast).toHaveCount(1);
    await expect(toast).toBeVisible();
    await expect(toast.locator('.text-base')).toHaveText(expectedMessage);
    await expect(toast).toHaveClass(websiteSuccessToastStylePattern);

    const dismissButton = toast.getByRole('button', { name: 'Dismiss toast', exact: true });
    await expect(dismissButton).toHaveCount(1);
    await dismissButton.click();
    await expect(toast).toBeHidden();

    const remainingRow = await searchDataStructure(page, dataStructure);
    await expect(
        remainingRow,
        `Data structure "${dataStructure}" remained after its success toast`
    ).toHaveCount(0);
    await expect(page.getByText('No rows available', { exact: true })).toBeVisible();
}

async function checkConstraint(page) {
    await openDataStructureForm(page);
    await page.getByRole('button', { name: 'Add variable', exact: true }).click();
    await expect(page.locator('input[id=constraints-0]')).toBeVisible();
}

async function navDataStructure(page) {
    const targetUrl = new URL('/rpm/datastructure', page.url()).toString();
    const targetOrigin = new URL(targetUrl).origin;
    const listResponsePromise = page.waitForResponse((candidate) => {
        const responseUrl = new URL(candidate.url());
        const pathname = responseUrl.pathname.replace(/\/$/, '').toLowerCase();
        return candidate.request().method() === 'GET' &&
            responseUrl.origin === targetOrigin &&
            pathname === '/rpm/datastructure/datastructures';
    }, { timeout: 20_000 }).then((listResponse) =>
        captureDataStructureListResponse(
            listResponse,
            'Data-structure list data request failed'
        )
    );
    const [response, listCapture] = await Promise.all([
        page.goto(targetUrl, { waitUntil: 'domcontentloaded' }),
        listResponsePromise,
    ]);
    if (!response) {
        throw new Error('Data-structure list navigation returned no response');
    }
    if (!response.ok()) {
        throw new Error(
            `Data-structure list request failed: ${response.status()} ${response.statusText()}`
        );
    }
    const finalUrl = new URL(page.url());
    const pathname = finalUrl.pathname.replace(/\/$/, '').toLowerCase();
    if (finalUrl.origin !== targetOrigin || pathname !== '/rpm/datastructure') {
        throw new Error(`Data-structure list redirected to unexpected URL "${finalUrl}"`);
    }

    await expect(page.locator('#create')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#datastructure-search')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#datastructure-search')).toHaveValue('');
    const expectedState = listCapture.model.length === 0 ? 'empty' : 'populated';
    const state = await waitForDataStructureListState(
        page,
        'The fresh data-structure list failed to render',
        expectedState
    );
    await assertRenderedDataStructuresMatchModel(
        page,
        listCapture.model,
        'The fresh data-structure list'
    );
    await assertNoVisibleWebsiteErrorToasts(page);
    return { model: listCapture.model, state };
}


async function editDataStructure(page, dataStructure) {
    const row = await searchDataStructure(page, dataStructure);
    await expect(row).toHaveCount(1);
    await row.locator('[id^=edit-]').click();
    await expect(page.locator('#description')).toBeVisible();


    // Fill in the title description textarea
    await page.locator('#description').fill('Edited test data structure');

    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // Click the on data type dropdown
    await page.locator('#dataType-0').click();
    await page.locator('.list-item:visible').getByText('Floating Point Number', { exact: true }).click();

    // Click the on unit dropdown
    await page.click('input[id=unit-0]');
    await page.locator('.list-item:visible').getByText('none', { exact: true }).click();

    // Click on save button
    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.locator('#datastructure-search')).toBeVisible();

}

async function findEditedDataStructure(page, dataStructure) {
    const row = await searchDataStructure(page, dataStructure);
    await expect(row).toHaveCount(1);

    // Get the index of the data structure
    const id = await row.getAttribute('id');
    const index = id.split('-')[2];

    // Check the values
    await expect(page.locator(`#datastructure-title-${index}`)).toHaveText(dataStructure);
    await expect(page.locator(`#datastructure-description-${index}`)).toHaveText(
        'Edited test data structure'
    );
}

async function cleanupDataStructure(page, dataStructure) {
    if (!page) {
        throw new Error(`Cannot clean data structure "${dataStructure}": page is unavailable`);
    }
    if (page.isClosed()) {
        throw new Error(`Cannot clean data structure "${dataStructure}": page is closed`);
    }

    const row = await searchDataStructure(page, dataStructure);
    if (await row.count() === 0) {
        await expect(page.getByText('No rows available', { exact: true })).toBeVisible();
        return false;
    }

    await expect(row).toHaveCount(1);
    await row.locator('[id^=delete-]').click();
    await confirmDataStructureDeletion(page, dataStructure);
    await checkAndCloseToast(page, dataStructure);
    return true;
}


module.exports = {

    createDataStructure,
    findDataStructure,
    deleteDataStructure,
    checkAndCloseToast,
    checkConstraint,
    navDataStructure,
    editDataStructure,
    findEditedDataStructure,
    checkDataStructure,
    cleanupDataStructure

};
