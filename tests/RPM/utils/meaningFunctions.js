import { expect } from "@playwright/test";

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const meaningListPath = '/rpm/meaning';
const meaningListResponsePath = '/rpm/meaning/get';
const meaningDeletePath = '/rpm/meaning/delete';

async function assertNoWebsiteErrorToast(page) {
    const toasts = await page.locator('[data-testid="toast"]:visible').evaluateAll((nodes) =>
        nodes.map((node) => ({
            text: (node.innerText || node.textContent || '').trim().replace(/\s+/g, ' '),
            classes: [node, ...node.querySelectorAll('*')]
                .map((element) => typeof element.className === 'string' ? element.className : '')
                .join(' '),
        }))
    );
    const errors = toasts.filter(({ text, classes }) =>
        /\b(?:error|exception|fehler|nre)\b|null\s*reference|object reference not set/i.test(text) ||
        /(?:^|\s)(?:variant-(?:filled|soft)-error|(?:bg|text|border)-error-\d+)(?:\s|$)/i.test(classes)
    );
    if (errors.length > 0) {
        throw new Error('Website error toast detected:\n' + errors.map(({ text }) => text).join('\n'));
    }
}

async function openFreshMeaningList(page) {
    await assertNoWebsiteErrorToast(page);

    const targetUrl = new URL(meaningListPath, page.url());
    const listResponseCapturePromise = page
        .waitForResponse((response) => {
            const responseUrl = new URL(response.url());
            return response.request().method() === 'GET' &&
                responseUrl.origin === targetUrl.origin &&
                responseUrl.pathname.toLowerCase() === meaningListResponsePath;
        })
        .then(async (response) => {
            // Consume the body immediately when Playwright emits the response.
            // Chromium can discard it while the surrounding document finishes
            // navigating even though the application already consumed it.
            const contentType = response.headers()['content-type'] || '';
            let bodyError;
            let listModel;
            if (/application\/json/i.test(contentType)) {
                try {
                    listModel = await response.json();
                } catch (error) {
                    bodyError = error;
                }
            }
            return { bodyError, contentType, listModel, response };
        });
    const [navigationResponse, capture] = await Promise.all([
        page.goto(targetUrl.toString(), { waitUntil: 'domcontentloaded' }),
        listResponseCapturePromise,
    ]);
    const listResponse = capture.response;

    expect(navigationResponse, 'Meaning list navigation returned no response').not.toBeNull();
    expect(
        navigationResponse.ok(),
        `Meaning list navigation failed: ${navigationResponse.status()}`
    ).toBeTruthy();
    expect(new URL(page.url()).pathname.replace(/\/$/, '').toLowerCase()).toBe(meaningListPath);
    expect(listResponse.ok(), `Meaning list request failed: ${listResponse.status()}`).toBeTruthy();
    expect(capture.contentType, 'Meaning list response was not JSON').toMatch(/application\/json/i);

    const bodyWasDiscardedByChromium = capture.bodyError &&
        /Protocol error \(Network\.getResponseBody\): No resource with given identifier found/i
            .test(String(capture.bodyError));
    if (capture.bodyError && !bodyWasDiscardedByChromium) {
        throw new Error(`Meaning list response body could not be read: ${String(capture.bodyError)}`);
    }
    if (!bodyWasDiscardedByChromium) {
        expect(Array.isArray(capture.listModel), 'Meaning list response is not an array').toBe(true);
    }

    const table = page.locator('#Meaning-table');
    const rows = table.locator('tbody > tr[id^="Meaning-row-"]');
    const emptyTable = table.locator('xpath=..').getByText('No rows available', { exact: true });
    const search = page.locator('#Meaning-search');
    const searchForm = search.locator('xpath=ancestor::form[1]');
    const searchButton = searchForm.locator('#Meaning-searchSubmit');

    await expect(page.locator('#create')).toBeVisible();
    await expect(table).toBeVisible();
    await expect(search).toBeVisible();
    await expect(search).toHaveValue('');
    await expect(searchForm).toHaveCount(1);
    await expect(searchButton).toHaveCount(1);
    await expect(searchButton).toBeVisible();
    await expect(searchButton).toBeEnabled();

    const getRenderedListState = async () => {
        const renderedRows = await rows.count();
        const empty = await emptyTable.isVisible();
        if (renderedRows > 0 && !empty) return 'populated';
        if (renderedRows === 0 && empty) return 'empty';
        return 'pending';
    };
    await expect.poll(getRenderedListState, {
        message: 'The fresh Meaning list did not finish rendering',
        timeout: 15_000,
    }).toMatch(/^(?:populated|empty)$/);

    const renderedListState = await getRenderedListState();
    if (!bodyWasDiscardedByChromium) {
        expect(renderedListState).toBe(capture.listModel.length === 0 ? 'empty' : 'populated');
    }

    await assertNoWebsiteErrorToast(page);
    return {
        emptyTable,
        listIsEmpty: bodyWasDiscardedByChromium
            ? renderedListState === 'empty'
            : capture.listModel.length === 0,
        rows,
        search,
        searchButton,
    };
}

async function searchMeaning(page, meaningName) {
    const { emptyTable, listIsEmpty, rows, search, searchButton } =
        await openFreshMeaningList(page);
    const exactName = new RegExp('^\\s*' + escapeRegExp(meaningName) + '\\s*$');
    const row = rows.filter({
        has: page.locator('[id^=Meaning-name-]', { hasText: exactName }),
    });

    // Only the just-observed list response may prove that the complete manager
    // is empty; never reuse a "No rows available" left by an older search.
    if (listIsEmpty) {
        await expect(row).toHaveCount(0);
        return row;
    }

    await search.fill(meaningName);
    await expect(search).toHaveValue(meaningName);
    await searchButton.click();

    await expect.poll(async () => {
        const matches = await row.count();
        const empty = await emptyTable.isVisible();
        const renderedRows = await rows.count();
        if (matches > 0) return 'found';
        if (empty && renderedRows === 0) return 'absent';
        return 'pending';
    }, {
        message: `Meaning search for "${meaningName}" did not finish rendering`,
        timeout: 15_000,
    }).toMatch(/^(?:found|absent)$/);
    await assertNoWebsiteErrorToast(page);
    return row;
}


async function checkMeanings(page, meaningName, hasDescription, hasRelation, hasApproved, hasSelectable, hasConstraints) {
    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);

    // Fill in the name and description if provided
    if (meaningName) {
        await page.locator('input[id=name]').fill(meaningName);
    }
    if (hasDescription) {
        await page.locator('textarea[id=description]').fill('Test Meanings');
    }
    if (hasRelation) {
        // Click the button
        await page.click('div.inline-block.align-bottom button.chip.variant-filled-primary');

        // Click the input element
        await page.click('div#relation-container');
        await page.waitForTimeout(500);
        await page.locator('.list-item .item.first').click();

        // Click the input element
        await page.click('div#others-container');
        await page.waitForTimeout(500);
        const objects = await page.waitForSelector('.list-item .item:text("occurrenceID")', { visible: true, enabled: true });
        await objects.click()

    }

    if (hasApproved) {
        // Click on the element based on its text content
        await page.click('div.slide-toggle-text:has-text("Approved")');
    }
    if (hasSelectable) {
        // Click on the element based on its text content
        await page.click('div.slide-toggle-text:has-text("Selectable")');
    }

    if (hasConstraints) {
        // Select Constraint
        await page.locator('#constraints').click();
        await page.waitForTimeout(500);
        const option = await page.waitForSelector('.list-item .item:text("Test Constraint")', { visible: true, enabled: true });
        await option.click()

    }

    // Handling different conditions based on parameters
    if (meaningName && hasDescription && !hasRelation && !hasApproved && !hasSelectable && !hasConstraints) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        await page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Meaning created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }

    else if (meaningName && hasDescription && hasRelation && !hasApproved && !hasSelectable && !hasConstraints) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        await page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Meaning created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }

    else if (meaningName && hasDescription && hasRelation && hasApproved && !hasSelectable && !hasConstraints) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        await page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Meaning created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }

    else if (meaningName && hasDescription && hasRelation && hasApproved && hasSelectable && !hasConstraints) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        await page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Meaning created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }

    else if (meaningName && hasDescription && hasRelation && !hasApproved && !hasSelectable && hasConstraints) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        await page.locator('button#save').click();
        await page.waitForTimeout(1000);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Meaning created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }
}

async function findMeanings(page, meaningName) {
    const row = await searchMeaning(page, meaningName);
    await expect(row).toHaveCount(1);
    await expect(row.locator('[id^=Meaning-name-]')).toHaveText(meaningName);
    await expect(row.locator('[id^=Meaning-description-]')).toHaveText(
        'Test Meanings'
    );
}

async function removeMeaning(page, meaningName, allowAbsent) {
    const row = await searchMeaning(page, meaningName);
    if (await row.count() === 0) {
        await expect(row).toHaveCount(0);
        if (allowAbsent) return false;
        await expect(row).toHaveCount(1);
    }

    await expect(row).toHaveCount(1);
    const meaningId = (await row.locator('[id^=Meaning-id-]').innerText()).trim();
    expect(meaningId, `Meaning "${meaningName}" has no numeric id`).toMatch(/^\d+$/);
    const deleteButton = row.locator('[id^=delete-]');
    await expect(deleteButton).toHaveCount(1);
    await deleteButton.click();

    const modal = page.locator('.modal:visible').filter({ hasText: 'Delete Meaning' });
    await expect(modal).toHaveCount(1);
    await expect(modal.locator('.modal-header')).toContainText('Delete Meaning');
    await expect(modal.locator('.modal-body')).toContainText('Are you sure you wish to delete Meaning');

    const targetUrl = new URL(page.url());
    const deleteResponsePromise = page.waitForResponse((response) => {
        const responseUrl = new URL(response.url());
        return response.request().method() === 'DELETE' &&
            responseUrl.origin === targetUrl.origin &&
            responseUrl.pathname.toLowerCase() === meaningDeletePath &&
            responseUrl.searchParams.get('id') === meaningId;
    });
    const [deleteResponse] = await Promise.all([
        deleteResponsePromise,
        modal.getByRole('button', { name: 'Confirm', exact: true }).click(),
    ]);
    expect(
        deleteResponse.ok(),
        `Meaning delete request failed: ${deleteResponse.status()}`
    ).toBeTruthy();
    await expect(modal).toBeHidden();
    await assertNoWebsiteErrorToast(page);

    await expect(
        await searchMeaning(page, meaningName),
        `Meaning "${meaningName}" remained after deletion`
    ).toHaveCount(0, { timeout: 15_000 });
    return true;
}

async function deleteMeanings(page, meaningName) {
    return await removeMeaning(page, meaningName, false);
}

async function cleanupMeaning(page, meaningName) {
    return await removeMeaning(page, meaningName, true);
}

async function createMeanings(page, meaningName) {
    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);

    // Fill in the name and description if provided
    await page.locator('input[id=name]').fill(meaningName);
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    await page.locator('textarea[id=description]').fill('Test Meanings');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // Click the button
    await page.click('div.inline-block.align-bottom button.chip.variant-filled-primary');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // Click the input element
    await page.click('div#relation-container');

    await page.waitForTimeout(500);
    await page.locator('.list-item .item.first').click();

    // Click the input element
    await page.click('div#others-container');
    await page.waitForTimeout(500);

    const objects = await page.waitForSelector('.list-item .item:text("occurrenceID")', { visible: true, enabled: true });
    await objects.click()

    // Click on the element based on its text content
    await page.click('div.slide-toggle-text:has-text("Approved")');
    await page.waitForTimeout(500);

    // Click on the element based on its text content
    await page.click('div.slide-toggle-text:has-text("Selectable")');
    await page.waitForTimeout(500);

    // Check if the save button is enable and reload the page
    await page.locator('button#save').click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'Meaning created.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();
}

async function editMeaning(page, meaning) {
    const row = await searchMeaning(page, meaning);
    await expect(row).toHaveCount(1);
    const editButton = row.locator('[id^=edit-]');
    await expect(editButton).toHaveCount(1);
    await editButton.click();
    await expect(page.locator('input[id=name]')).toBeVisible();
    await page.locator('input[id=name]').fill(meaning);

    // Click on the element based on its text content
    await page.click('div.slide-toggle-text:has-text("Approved")');
    await page.waitForTimeout(500);

    // Click on the element based on its text content
    await page.click('div.slide-toggle-text:has-text("Selectable")');
    await page.waitForTimeout(500);
    await page.locator('button[id=save]').click();

    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Meaning updated.`
    );
    await toast.locator('button').click(); // Close the toast
}

async function findEditedMeanings(page, meaning) {
    const row = await searchMeaning(page, meaning);
    await expect(row).toHaveCount(1);
    await expect(row.locator('[id^=Meaning-name-]')).toHaveText(meaning);
    await expect(row.locator('[id^=Meaning-description-]')).toHaveText(
        'Test Meanings'
    );

}

module.exports = {
    checkMeanings,
    findMeanings,
    deleteMeanings,
    cleanupMeaning,
    createMeanings,
    editMeaning,
    findEditedMeanings
};
