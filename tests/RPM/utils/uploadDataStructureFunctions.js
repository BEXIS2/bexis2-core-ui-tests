import { expect } from "@playwright/test";

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
const websiteErrorToastTextPattern =
    /\b(?:error|exception|failed|failure|fehler|nre|unable)\b|could not|cannot|can't|null\s*reference|object reference not set/i;
const websiteErrorToastStylePattern =
    /(?:^|\s)(?:variant-(?:filled|soft)-error|(?:bg|text|border)-error-\d+)(?:\s|$)/i;
const websiteSuccessToastStylePattern =
    /(?:^|\s)(?:variant-(?:filled|soft)-success|(?:bg|text|border)-success-\d+)(?:\s|$)/i;

async function assertNoVisibleWebsiteErrorToasts(page) {
    const errors = await page.locator('.toast[data-testid="toast"]:visible').evaluateAll(
        (toasts, { textSource, textFlags, styleSource, styleFlags }) => {
            const textPattern = new RegExp(textSource, textFlags);
            const stylePattern = new RegExp(styleSource, styleFlags);

            return toasts
                .map((toast) => ({
                    text: (toast.textContent || '').trim().replace(/\s+/g, ' '),
                    classes: [toast, ...toast.querySelectorAll('*')]
                        .map((element) => typeof element.className === 'string' ? element.className : '')
                        .join(' '),
                }))
                .filter(({ text, classes }) => textPattern.test(text) || stylePattern.test(classes));
        },
        {
            textSource: websiteErrorToastTextPattern.source,
            textFlags: websiteErrorToastTextPattern.flags,
            styleSource: websiteErrorToastStylePattern.source,
            styleFlags: websiteErrorToastStylePattern.flags,
        }
    );

    if (errors.length > 0) {
        throw new Error(
            'Website error toast detected:\n' + errors.map(({ text }) => text).join('\n')
        );
    }
}

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
        throw new Error(`${context}: ${response.status()} ${response.statusText()}`);
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
        throw new Error(`Cannot search for uploaded data structure "${dataStructure}": page is unavailable`);
    }
    if (page.isClosed()) {
        throw new Error(`Cannot search for uploaded data structure "${dataStructure}": page is closed`);
    }

    const { model, state: freshState } = await navDataStructure(page);
    const row = exactDataStructureRow(page, dataStructure);
    const serverMatches = model.filter((item) => item.title === dataStructure);
    if (serverMatches.length > 1) {
        throw new Error(
            `Uploaded data-structure list response has multiple exact rows for "${dataStructure}"`
        );
    }
    if (freshState === 'empty') {
        await expect(row).toHaveCount(0);
        return row;
    }

    const initialMatches = await row.count();
    if (initialMatches > 1) {
        throw new Error(`Fresh uploaded data-structure list has multiple exact rows for "${dataStructure}"`);
    }
    if (initialMatches !== serverMatches.length && initialMatches > 0) {
        throw new Error(
            `Fresh DOM and list response disagree for uploaded data structure "${dataStructure}"`
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
        `Uploaded data-structure search for "${dataStructure}" failed`,
        serverMatches.length === 1 ? 'found' : 'absent',
        dataStructure,
        previousSignature
    );
    await assertRenderedDataStructuresMatchModel(
        page,
        serverMatches,
        `Uploaded data-structure search for "${dataStructure}"`
    );
    if (serverMatches.length === 1) {
        await expect(row).toHaveCount(1);
    } else {
        await expect(row).toHaveCount(0);
    }
    return row;
}

async function mappingSaveButton(page) {
    const mappingTable = page.locator('table.table:visible');
    await expect(mappingTable).toHaveCount(1);

    const mappingPanel = mappingTable.locator(
        'xpath=ancestor::*[self::form or self::section or self::main][1]'
    );
    await expect(mappingPanel).toHaveCount(1);

    const saveButton = mappingPanel.getByRole('button', {
        name: /^save$/i,
    });
    await expect(saveButton).toHaveCount(1);
    return saveButton;
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

async function checkUploadDataStructure(page, hasEmptyData, hasVariables, hasVariablesAndUnit, hasVariablesUnitAndMissingValues) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Click on the create button
    await page.locator('#create').click();
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Wait for the file input to be present in the DOM
    await expect(page.locator('input[accept=".csv,.txt,.tsv"]')).toBeAttached();


    if (hasEmptyData == "isEmpty") {

        const path = require('path');
        const filePath = path.resolve(__dirname, 'Empty_data.csv');  // This resolves the file path from the current folder
        await page.setInputFiles('input[type="file"]', filePath);
        // Wait for 2000 milliseconds
        await page.waitForTimeout(2000);

    }

    if (hasVariables == "hasVariables") {

        const path = require('path');
        const filePath = path.resolve(__dirname, 'Has_variables.csv');  // This resolves the file path from the current folder
        await page.setInputFiles('input[type="file"]', filePath);
        // Wait for 2000 milliseconds
        await page.waitForTimeout(2000);

    }

    if (hasVariablesAndUnit == "hasVariablesAndUnit") {

        const path = require('path');
        const filePath = path.resolve(__dirname, 'Has_variables_data.csv');  // This resolves the file path from the current folder
        await page.setInputFiles('input[type="file"]', filePath);
        // Wait for 2000 milliseconds
        await page.waitForTimeout(2000);

    }

    if (hasVariablesUnitAndMissingValues == "hasVariablesUnitAndMissingValues") {

        const path = require('path');
        const filePath = path.resolve(__dirname, 'Test_data.csv');  // This resolves the file path from the current folder
        await page.setInputFiles('input[type="file"]', filePath);
        // Wait for 2000 milliseconds
        await page.waitForTimeout(2000);

    }
    
    // Handling different conditions based on parameters
    if (hasEmptyData && !hasVariables && !hasVariablesAndUnit && !hasVariablesUnitAndMissingValues) {
        await navDataStructure (page)
    }

    else if (!hasEmptyData && hasVariables && !hasVariablesAndUnit && !hasVariablesUnitAndMissingValues) {
        // Wait for the table to load
        await expect(page.locator('table.table tbody tr:first-child td:first-child')).toBeVisible();

        // Click on the first td in the first row
        await page.click('table.table tbody tr:first-child td:first-child');
        
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectVar');

        // Click on the button
        await page.click('#selectVar');

        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);

        // Check if the save button is disabled and reload the page
        const saveButton = await mappingSaveButton(page);
        await expect(saveButton).toBeDisabled();

    }

    else if (!hasEmptyData && !hasVariables && hasVariablesAndUnit && !hasVariablesUnitAndMissingValues) {
        // Wait for the table to load
        await expect(page.locator('table.table tbody tr:first-child td:first-child')).toBeVisible();

        // Click on the first td in the first row
        await page.click('table.table tbody tr:first-child td:first-child');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectVar');

        // Click on the button
        await page.click('#selectVar');

        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForSelector('table.table tbody tr:nth-child(2) td:first-child');

        // Click on the first <td> in the second row
        await page.click('table.table tbody tr:nth-child(2) td:first-child');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectUnit');

        // Click on the button
        await page.click('#selectUnit');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);

        // Check if the save button is disabled and reload the page
        const saveButton = await mappingSaveButton(page);
        await expect(saveButton).toBeDisabled();

    }

    else if (!hasEmptyData && !hasVariables && !hasVariablesAndUnit && hasVariablesUnitAndMissingValues) {
        // Wait for the table to load
        await expect(page.locator('table.table tbody tr:first-child td:first-child')).toBeVisible();

        // Click on the first td in the first row
        await page.click('table.table tbody tr:first-child td:first-child');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectVar');

        // Click on the button
        await page.click('#selectVar');

        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForSelector('table.table tbody tr:nth-child(2) td:first-child');

        // Click on the first <td> in the second row
        await page.click('table.table tbody tr:nth-child(2) td:first-child');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectUnit');

        // Click on the button
        await page.click('#selectUnit');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForSelector('table.table tbody tr:nth-child(3) td:first-child');

        // Click on the first <td> in the second row
        await page.click('table.table tbody tr:nth-child(3) td:first-child');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectMissingValues');

        // Click on the button
        await page.click('#selectMissingValues');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);

        // Check if the save button is disabled and reload the page
        const saveButton = await mappingSaveButton(page);
        await expect(saveButton).toBeDisabled();

    }
}

async function uploadDataStructure(page, titleName) {

    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Click on the create button
    await page.locator('#create').click();
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Wait for the file input to be present in the DOM
    await expect(page.locator('input[accept=".csv,.txt,.tsv"]')).toBeAttached();

    const path = require('path');
    const filePath = path.resolve(__dirname, 'Test_data.csv');  // This resolves the file path from the current folder

    await page.setInputFiles('input[type="file"]', filePath);
    // Wait for 2000 milliseconds
    await page.waitForTimeout(2000);

    // Wait for the table to load
    await expect(page.locator('table.table tbody tr:first-child td:first-child')).toBeVisible();

    // Click on the first td in the first row
    await page.click('table.table tbody tr:first-child td:first-child');
    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    // Wait for the button with the id 'selectVar' to be present in the DOM
    await page.waitForSelector('#selectVar');

    // Click on the button
    await page.click('#selectVar');

    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    await page.waitForSelector('table.table tbody tr:nth-child(2) td:first-child');

    // Click on the first <td> in the second row
    await page.click('table.table tbody tr:nth-child(2) td:first-child');
    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    // Wait for the button with the id 'selectVar' to be present in the DOM
    await page.waitForSelector('#selectData');

    // Click on the button
    await page.click('#selectData');
    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    await page.waitForSelector('table.table tbody tr:nth-child(3) td:first-child');

    // Click on the first <td> in the second row
    await page.click('table.table tbody tr:nth-child(3) td:first-child');
    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    // Wait for the button with the id 'selectVar' to be present in the DOM
    await page.waitForSelector('#selectDescription');

    // Click on the button
    await page.click('#selectDescription');
    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    // Wait for the button with the title "save" to appear
    const mapSaveButton = await mappingSaveButton(page);
    await expect(mapSaveButton).toBeEnabled();
    await mapSaveButton.click();
    await expect(page.locator('input[id=title]')).toBeVisible();

    // Fill in the title input
    await page.locator('input[id=title]').fill(titleName);

    // Fill in the title description textarea
    await page.locator('#description').fill('Test data structure');

    // Click on make a part of primary key 
    await page.locator('input[title="Variable is not part of primary key"]').first().click();

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
        { message: `No deletion toast appeared for uploaded data structure "${dataStructure}"` }
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
        `Uploaded data structure "${dataStructure}" remained after its success toast`
    ).toHaveCount(0);
    await expect(page.getByText('No rows available', { exact: true })).toBeVisible();
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
            'Uploaded data-structure list data request failed'
        )
    );
    const [response, listCapture] = await Promise.all([
        page.goto(targetUrl, { waitUntil: 'domcontentloaded' }),
        listResponsePromise,
    ]);
    if (!response) {
        throw new Error('Uploaded data-structure list navigation returned no response');
    }
    if (!response.ok()) {
        throw new Error(
            `Uploaded data-structure list request failed: ${response.status()} ${response.statusText()}`
        );
    }
    const finalUrl = new URL(page.url());
    const pathname = finalUrl.pathname.replace(/\/$/, '').toLowerCase();
    if (finalUrl.origin !== targetOrigin || pathname !== '/rpm/datastructure') {
        throw new Error(`Uploaded data-structure list redirected to unexpected URL "${finalUrl}"`);
    }

    await expect(page.locator('#create')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#datastructure-search')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#datastructure-search')).toHaveValue('');
    const expectedState = listCapture.model.length === 0 ? 'empty' : 'populated';
    const state = await waitForDataStructureListState(
        page,
        'The fresh uploaded data-structure list failed to render',
        expectedState
    );
    await assertRenderedDataStructuresMatchModel(
        page,
        listCapture.model,
        'The fresh uploaded data-structure list'
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

    // Click on optional value
    await page.locator('input[title="Variable does not allow empty values"]').first().click();

   // Click the on template data dropdown
   await page.click('#variableTemplate-0');
   await page.waitForTimeout(500);
   await page.locator('.list-item:visible').getByText('percentage', { exact: true }).click();

   // Click the on data type dropdown
   await page.click('#dataType-0');
   await page.waitForTimeout(500);
   await page.locator('.list-item:visible').getByText('Floating Point Number', { exact: true }).click();

   // Click the on unit dropdown
   await page.click('#unit-0');
   await page.waitForTimeout(500);
   await page.locator('.list-item:visible').getByText('%', { exact: true }).click();

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
        throw new Error(`Cannot clean uploaded data structure "${dataStructure}": page is unavailable`);
    }
    if (page.isClosed()) {
        throw new Error(`Cannot clean uploaded data structure "${dataStructure}": page is closed`);
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

    uploadDataStructure,
    findDataStructure,
    deleteDataStructure,
    checkAndCloseToast,
    navDataStructure,
    editDataStructure,
    findEditedDataStructure,
    checkUploadDataStructure,
    cleanupDataStructure

};
