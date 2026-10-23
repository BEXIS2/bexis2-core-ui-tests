import { expect } from "@playwright/test";

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const externalLinkListPath = '/rpm/externallink';
const externalLinkListResponsePath = '/rpm/externallink/get';
const externalLinkDeletePath = '/rpm/externallink/delete';

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

async function openFreshExternalLinkList(page) {
    await assertNoWebsiteErrorToast(page);

    const targetUrl = new URL(externalLinkListPath, page.url());
    const listResponseCapturePromise = page
        .waitForResponse((response) => {
            const responseUrl = new URL(response.url());
            return response.request().method() === 'GET' &&
                responseUrl.origin === targetUrl.origin &&
                responseUrl.pathname.toLowerCase() === externalLinkListResponsePath;
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

    expect(navigationResponse, 'External Link list navigation returned no response').not.toBeNull();
    expect(
        navigationResponse.ok(),
        `External Link list navigation failed: ${navigationResponse.status()}`
    ).toBeTruthy();
    expect(new URL(page.url()).pathname.replace(/\/$/, '').toLowerCase()).toBe(
        externalLinkListPath
    );
    expect(
        listResponse.ok(),
        `External Link list request failed: ${listResponse.status()}`
    ).toBeTruthy();
    expect(capture.contentType, 'External Link list response was not JSON').toMatch(
        /application\/json/i
    );

    const bodyWasDiscardedByChromium = capture.bodyError &&
        /Protocol error \(Network\.getResponseBody\): No resource with given identifier found/i
            .test(String(capture.bodyError));
    if (capture.bodyError && !bodyWasDiscardedByChromium) {
        throw new Error(
            `External Link list response body could not be read: ${String(capture.bodyError)}`
        );
    }
    if (!bodyWasDiscardedByChromium) {
        expect(
            Array.isArray(capture.listModel),
            'External Link list response is not an array'
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
        message: 'The fresh External Link list did not finish rendering',
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

async function searchExternalLink(page, linkName) {
    const { emptyTable, listIsEmpty, rows, search, searchButton } =
        await openFreshExternalLinkList(page);
    const exactName = new RegExp('^\\s*' + escapeRegExp(linkName) + '\\s*$');
    const row = rows.filter({
        has: page.locator('[id^="ExternalLinks-name-"]', { hasText: exactName }),
    });

    // Only the just-observed list response may prove that the complete manager
    // is empty; never reuse a "No rows available" left by an older search.
    if (listIsEmpty) {
        await expect(row).toHaveCount(0);
        return row;
    }

    await search.fill(linkName);
    await expect(search).toHaveValue(linkName);
    await searchButton.click();

    await expect.poll(async () => {
        const matches = await row.count();
        const empty = await emptyTable.isVisible();
        const renderedRows = await rows.count();
        if (matches > 0) return 'found';
        if (empty && renderedRows === 0) return 'absent';
        return 'pending';
    }, {
        message: `External Link search for "${linkName}" did not finish rendering`,
        timeout: 15_000,
    }).toMatch(/^(?:found|absent)$/);
    await assertNoWebsiteErrorToast(page);
    return row;
}


async function checkExternalLink(page, linkName, hasType, hasPrefix, hasURI) {
    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);

    // Fill in the name and description if provided
    if (linkName) {
        await page.locator('input[id=name]').fill(linkName);
    }
   
    if (hasType) {

        // Click the input element
        await page.click('#type');
        await page.waitForTimeout(500);
        await page.locator('.list-item .item:text("link")').click();
    }

    if (hasPrefix) {
           // Click the input element
           await page.click('#prefix');
           await page.waitForTimeout(500);
           await page.locator('.list-item .item:text("dwc")').click();

    }
    if (hasURI) {
        await page.locator('input[id=uri]').fill(hasURI);
    }

    // Handling different conditions based on parameters
    if (linkName && hasType && !hasPrefix && !hasURI) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()
    }

    else if (linkName && hasType && hasPrefix && !hasURI) {    
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()
    }
    else if (linkName && !hasType && !hasPrefix && hasURI) {    
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()
    }
}

async function findExternalLink(page, linkName) {
    const row = await searchExternalLink(page, linkName);
    await expect(row).toHaveCount(1);
    await expect(row.locator('[id^=ExternalLinks-name-]')).toHaveText(linkName);
    await expect(row.locator('[id^=ExternalLinks-uri-]')).toHaveText(
        'test@testing.com'
    );
}

async function removeExternalLink(page, linkName, allowAbsent) {
    const row = await searchExternalLink(page, linkName);
    if (await row.count() === 0) {
        await expect(row).toHaveCount(0);
        if (allowAbsent) return false;
        await expect(row).toHaveCount(1);
    }

    await expect(row).toHaveCount(1);
    const externalLinkId = (await row.locator('[id^=ExternalLinks-id-]').innerText()).trim();
    expect(externalLinkId, `External Link "${linkName}" has no numeric id`).toMatch(/^\d+$/);
    const deleteButton = row.locator('[id^=delete-]');
    await expect(deleteButton).toHaveCount(1);
    await deleteButton.click();

    const modal = page.locator('.modal:visible').filter({ hasText: 'Delete External Link' });
    await expect(modal).toHaveCount(1);
    await expect(modal.locator('.modal-header')).toContainText('Delete External Link');
    await expect(modal.locator('.modal-body')).toContainText('Are you sure you wish to delete external link');

    const targetUrl = new URL(page.url());
    const deleteResponsePromise = page.waitForResponse((response) => {
        const responseUrl = new URL(response.url());
        return response.request().method() === 'DELETE' &&
            responseUrl.origin === targetUrl.origin &&
            responseUrl.pathname.toLowerCase() === externalLinkDeletePath &&
            responseUrl.searchParams.get('id') === externalLinkId;
    });
    const [deleteResponse] = await Promise.all([
        deleteResponsePromise,
        modal.getByRole('button', { name: 'Confirm', exact: true }).click(),
    ]);
    expect(
        deleteResponse.ok(),
        `External Link delete request failed: ${deleteResponse.status()}`
    ).toBeTruthy();
    await expect(modal).toBeHidden();
    await assertNoWebsiteErrorToast(page);

    await expect(
        await searchExternalLink(page, linkName),
        `External Link "${linkName}" remained after deletion`
    ).toHaveCount(0, { timeout: 15_000 });
    return true;
}

async function deleteExternalLink(page, linkName) {
    return await removeExternalLink(page, linkName, false);
}

async function cleanupExternalLink(page, linkName) {
    return await removeExternalLink(page, linkName, true);
}

async function createExternalLink(page, linkName) {

    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);
   // Fill in the name and description if provided
  
    await page.locator('input[id=name]').fill(linkName);

    await page.click('#type');
    await page.waitForTimeout(500);
    await page.locator('.list-item .item:text("link")').click();

    await page.click('#prefix');
    await page.waitForTimeout(500);
    await page.locator('.list-item .item:text("dwc")').click();

    await page.locator('input[id=uri]').fill("test@testing.com");

    // Check if the save button is enable and reload the page
    await page.locator('button#save').click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'External link created.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();
}

async function editExternalLink(page, linkName) {
    const row = await searchExternalLink(page, linkName);
    await expect(row).toHaveCount(1);
    const editButton = row.locator('[id^=edit-]');
    await expect(editButton).toHaveCount(1);
    await editButton.click();
    await expect(page.locator('input[id=name]')).toBeVisible();
    await page.locator('input[id=name]').fill(linkName);

    await page.locator('input[id=uri]').fill('testing');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    // Check if the save button is enable and reload the page
    await page.locator('button#save').click();

    await page.waitForTimeout(1000);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'External link updated.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();
   
}

async function findEditedExternalLink(page, linkName) {
    const row = await searchExternalLink(page, linkName);
    await expect(row).toHaveCount(1);
    await expect(row.locator('[id^=ExternalLinks-name-]')).toHaveText(linkName);
    await expect(row.locator('[id^=ExternalLinks-uri-]')).toHaveText(
        'testing'
    );

}

module.exports = {
    checkExternalLink,
    findExternalLink,
    deleteExternalLink,
    cleanupExternalLink,
    createExternalLink,
    editExternalLink,
    findEditedExternalLink
};
