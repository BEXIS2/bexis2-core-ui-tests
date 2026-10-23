import { expect } from "@playwright/test";

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const prefixListPath = '/rpm/externallink/prefixcategory';
const prefixListResponsePath = '/rpm/externallink/getprefixcategories';
const prefixDeletePath = '/rpm/externallink/deleteprefixcategory';

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

async function openFreshPrefixList(page) {
    await assertNoWebsiteErrorToast(page);

    const targetUrl = new URL(prefixListPath, page.url());
    const listResponseCapturePromise = page
        .waitForResponse((response) => {
            const responseUrl = new URL(response.url());
            return response.request().method() === 'GET' &&
                responseUrl.origin === targetUrl.origin &&
                responseUrl.pathname.toLowerCase() === prefixListResponsePath;
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

    expect(navigationResponse, 'Prefix Category list navigation returned no response').not.toBeNull();
    expect(
        navigationResponse.ok(),
        `Prefix Category list navigation failed: ${navigationResponse.status()}`
    ).toBeTruthy();
    expect(new URL(page.url()).pathname.replace(/\/$/, '').toLowerCase()).toBe(prefixListPath);
    expect(
        listResponse.ok(),
        `Prefix Category list request failed: ${listResponse.status()}`
    ).toBeTruthy();
    expect(capture.contentType, 'Prefix Category list response was not JSON').toMatch(
        /application\/json/i
    );

    const bodyWasDiscardedByChromium = capture.bodyError &&
        /Protocol error \(Network\.getResponseBody\): No resource with given identifier found/i
            .test(String(capture.bodyError));
    if (capture.bodyError && !bodyWasDiscardedByChromium) {
        throw new Error(
            `Prefix Category list response body could not be read: ${String(capture.bodyError)}`
        );
    }
    if (!bodyWasDiscardedByChromium) {
        expect(
            Array.isArray(capture.listModel),
            'Prefix Category list response is not an array'
        ).toBe(true);
    }

    const table = page.locator('#ExternalLinks-table');
    const rows = table.locator('tbody > tr[id^="ExternalLinks-row-"]');
    const emptyTable = table.locator('xpath=..').getByText('No rows available', { exact: true });
    const search = page.locator('#ExternalLinks-search');
    const searchForm = search.locator('xpath=ancestor::form[1]');
    const searchButton = searchForm.locator('#ExternalLinks-searchSubmit');

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
        message: 'The fresh Prefix Category list did not finish rendering',
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

async function searchPrefix(page, prefixName) {
    const { emptyTable, listIsEmpty, rows, search, searchButton } =
        await openFreshPrefixList(page);
    const exactName = new RegExp('^\\s*' + escapeRegExp(prefixName) + '\\s*$');
    const row = rows.filter({
        has: page.locator('[id^=ExternalLinks-name-]', { hasText: exactName }),
    });

    // Only the just-observed list response may prove that the complete manager
    // is empty; never reuse a "No rows available" left by an older search.
    if (listIsEmpty) {
        await expect(row).toHaveCount(0);
        return row;
    }

    await search.fill(prefixName);
    await expect(search).toHaveValue(prefixName);
    await searchButton.click();

    await expect.poll(async () => {
        const matches = await row.count();
        const empty = await emptyTable.isVisible();
        const renderedRows = await rows.count();
        if (matches > 0) return 'found';
        if (empty && renderedRows === 0) return 'absent';
        return 'pending';
    }, {
        message: `Prefix Category search for "${prefixName}" did not finish rendering`,
        timeout: 15_000,
    }).toMatch(/^(?:found|absent)$/);
    await assertNoWebsiteErrorToast(page);
    return row;
}


async function checkPrefix(page, prefixName, hasDescription){
    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);

    // Fill in the name and description if provided
    if (prefixName) {
        await page.locator('input[id=name]').fill(prefixName);
    }

    if (hasDescription) {
        await page.locator('input[id=description]').fill(hasDescription);
    }

   

    // Handling different conditions based on parameters
    if (!prefixName && hasDescription ) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()
    }


    else if (prefixName && !hasDescription ) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        await page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Prefix Category created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }


}

async function findPrefix(page, prefixName) {
    const row = await searchPrefix(page, prefixName);
    await expect(row).toHaveCount(1);
    await expect(row.locator('[id^=ExternalLinks-name-]')).toHaveText(prefixName);
   
}

async function removePrefix(page, prefixName, allowAbsent) {
    const row = await searchPrefix(page, prefixName);
    if (await row.count() === 0) {
        await expect(row).toHaveCount(0);
        if (allowAbsent) return false;
        await expect(row).toHaveCount(1);
    }

    await expect(row).toHaveCount(1);
    const prefixId = (await row.locator('[id^=ExternalLinks-id-]').innerText()).trim();
    expect(prefixId, `Prefix Category "${prefixName}" has no numeric id`).toMatch(/^\d+$/);
    const deleteButton = row.locator('[id^=delete-]');
    await expect(deleteButton).toHaveCount(1);
    await deleteButton.click();

    const modal = page.locator('.modal:visible').filter({ hasText: 'Delete Prefix Category' });
    await expect(modal).toHaveCount(1);
    await expect(modal.locator('.modal-header')).toContainText('Delete Prefix Category');
    await expect(modal.locator('.modal-body')).toContainText('Are you sure you wish to delete Prefix Category');

    const targetUrl = new URL(page.url());
    const deleteResponsePromise = page.waitForResponse((response) => {
        const responseUrl = new URL(response.url());
        return response.request().method() === 'DELETE' &&
            responseUrl.origin === targetUrl.origin &&
            responseUrl.pathname.toLowerCase() === prefixDeletePath &&
            responseUrl.searchParams.get('id') === prefixId;
    });
    const [deleteResponse] = await Promise.all([
        deleteResponsePromise,
        modal.getByRole('button', { name: 'Confirm', exact: true }).click(),
    ]);
    expect(
        deleteResponse.ok(),
        `Prefix Category delete request failed: ${deleteResponse.status()}`
    ).toBeTruthy();
    await expect(modal).toBeHidden();
    await assertNoWebsiteErrorToast(page);

    await expect(
        await searchPrefix(page, prefixName),
        `Prefix Category "${prefixName}" remained after deletion`
    ).toHaveCount(0, { timeout: 15_000 });
    return true;
}

async function deletePrefix(page, prefixName) {
    return await removePrefix(page, prefixName, false);
}

async function cleanupPrefix(page, prefixName) {
    return await removePrefix(page, prefixName, true);
}

async function createPrefix(page, prefixName) {

    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);
    // Fill in the name and description if provided

    await page.locator('input[id=name]').fill(prefixName);

    await page.locator('input[id=description]').fill("Test description");

    // Check if the save button is enable and reload the page
    await page.locator('button#save').click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'Prefix Category created.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();
}

async function editPrefix(page,prefixName) {
    const row = await searchPrefix(page, prefixName);
    await expect(row).toHaveCount(1);
    const editButton = row.locator('[id^=edit-]');
    await expect(editButton).toHaveCount(1);
    await editButton.click();
    await expect(page.locator('input[id=name]')).toBeVisible();
    await page.locator('input[id=name]').fill(prefixName);
    // Wait for 500 milliseconds
    await page.locator('input[id=description]').fill("Edit description");
    await page.waitForTimeout(500);
    // Check if the save button is enable and reload the page
    await page.locator('button#save').click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'Prefix Category updated.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();

}

async function findEditedPrefix(page, prefixName) {
    const row = await searchPrefix(page, prefixName);
    await expect(row).toHaveCount(1);
    await expect(row.locator('[id^=ExternalLinks-name-]')).toHaveText(prefixName);
    await expect(row.locator('[id^=ExternalLinks-description-]')).toHaveText(
        'Edit description'
    );

}

module.exports = {
    checkPrefix,
    findPrefix,
    deletePrefix,
    cleanupPrefix,
    createPrefix,
    editPrefix,
    findEditedPrefix
};
