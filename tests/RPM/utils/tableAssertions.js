import { expect } from '@playwright/test';

export async function searchNamedTable(page, { tableId, listPath, name }) {
    const searchInput = page.locator(`#${tableId}-search`);
    const searchButton = page.locator(`#${tableId}-searchSubmit`);
    const rows = page.locator(`[id^="${tableId}-row-"]`);
    const row = rows.filter({ has: page.getByText(name, { exact: true }) });
    const noRows = page.getByText('No rows available', { exact: true });

    await expect(searchInput).toBeVisible();
    await expect(searchButton).toBeVisible();

    // Verify existence independently so an empty/stale UI cannot make cleanup
    // silently skip a saved record. An empty persisted list is a valid state.
    let response;
    try {
        response = await page.request.get(new URL(listPath, page.url()).href, {
            timeout: 20_000,
            // Only retry a connection reset, never an HTTP/application failure.
            maxRetries: 1,
        });
    } catch (error) {
        // Playwright's request log can include authentication cookies.
        const message = String(error).split('Call log:')[0].trim();
        throw new Error(`Cannot read persisted ${tableId} records: ${message}`);
    }
    await expect(response, `Cannot read persisted ${tableId} records`).toBeOK();
    const items = await response.json();
    expect(Array.isArray(items), `${listPath} must return an array`).toBe(true);
    const matches = items.filter(item => item.name === name);
    expect(matches.length, `Duplicate ${tableId} records named "${name}"`).toBeLessThanOrEqual(1);

    await searchInput.fill(name);
    await searchButton.click();
    // Submitting a new query replaces the previous one; neither an initially
    // populated table nor a change in row IDs is required.
    await expect(rows).toHaveCount(matches.length, { timeout: 15_000 });
    await expect(row).toHaveCount(matches.length, { timeout: 15_000 });
    if (matches.length === 0) {
        await expect(noRows).toBeVisible();
    } else {
        await expect(noRows).toBeHidden();
    }
    return { row, noRows };
}
