import { test, expect } from '@playwright/test';
class ConstraintHandler {
    constructor() {
        this._constraintDelete = false;
    }

    // Getter
    get constraintDelete() {
        return this._constraintDelete;
    }

    // Setter
    set constraintDelete(value) {
        this._constraintDelete = value;
    }
}

// Usage
const handler = new ConstraintHandler();

async function checkTitle(page, expectedTitle, parentSelector, titleSelector) {
    // Wait for the title element to be visible
    await page.waitForSelector(parentSelector, { state: 'visible' });

    // Locate the title directly without using a parent locator
    const parent = await page.locator(parentSelector);

    // Wait for the title element to be visible
    await page.waitForSelector(titleSelector, { state: 'visible' });

    // Locate the title directly without using a parent locator
    const title = await page.locator(titleSelector);

    await expect(title).toHaveText(expectedTitle);
}

async function deleteConstraint(page, constraint) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Search for the constraint
    await page.locator('#constraints-search').fill(constraint);
    // Click on the delete button
    await page.locator('[id^=delete-]').click();

    // Wait until the modal appears
    await page.waitForSelector('.modal');

    // Check the modal title and body text
    await expect(page.locator('.modal-header')).toHaveText('Delete Constraint');
    await expect(page.locator('.modal-body')).toHaveText(`Are you sure you wish to delete Constraint "${constraint}?`);

    // Click the confirm button in the modal footer
    await page.locator('.modal-footer button.variant-filled').click();
    await page.waitForLoadState('load');

    // Set the value
    handler.constraintDelete = true;
}
async function checkAndCloseToast(page, constraint) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(`Constraint "${constraint}" deleted.`);

    // Close the toast
    await toast.locator('button').click();
}


module.exports = {
    checkTitle,
    deleteConstraint,
    checkAndCloseToast,
};