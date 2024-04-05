import { test, expect } from '@playwright/test';
const { checkAndCloseToast, deleteConstraint } = require('./uniqueFunction');
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
async function checkRangeConstraint(page, constraint, hasDescription, hasRangeType, hasLowerBoundValue, hasUpperBoundValue) {
    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);

    // Fill in the name and description if provided
    if (constraint) {
        await page.locator('input[id=name]').fill(constraint);
    }
    if (hasDescription) {
        await page.locator('textarea[id=description]').fill('Test constraint');
    }

    // Select 'Range' option from dropdown if hasRangeType is true
    if (hasRangeType) {
        await page.selectOption('#constraintTypes', 'Range');
    }
    // Add 'Console input' if hasConsoleinput is true
    if (hasLowerBoundValue && hasUpperBoundValue) {
        await page.waitForTimeout(500);
        // Click on the div to focus
        // Adding lowebound value '1'
        await page.fill('#lowerbound', '1');
        // Adding upperbound value '5'
        await page.fill('#upperbound', '5');
        // Wait for 500 milliseconds
        await page.waitForTimeout(500);
    }

    // Handling different conditions based on parameters
    if (!constraint && !hasDescription && hasRangeType && !hasLowerBoundValue) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()
        // Set the value
        // handler.constraintDelete = true;
    }
    else if (constraint && !hasDescription && hasRangeType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();
    }
    else if (!constraint && hasDescription && hasRangeType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();
        // Set the value
        //   handler.constraintDelete = true;
    }
    else if (constraint && hasDescription && hasRangeType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Click on save button and wait for toast message
        await page.click('#save');
        // Set the value
        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');
        let expectedMessage =
            `Constraint "${constraint}" saved.`;

        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        //   handler.constraintDelete = true;
        await page.reload();
        //  await page.reload();
        await deleteConstraint(page, constraint);
        await checkAndCloseToast(page, constraint);
    }
    else if (!constraint && !hasDescription && hasRangeType && hasLowerBoundValue && hasUpperBoundValue) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1000);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = `Can't save Constraint "null" .Name is Null or Empty`;
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }
}

async function createRangeConstraint(page, constraint) {
    await page.reload()
    await page.waitForLoadState('load');
    // Click on the create button
    await page.locator('#create').click();
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Fill in the name input
    await page.locator('input[id=name]').fill(constraint);
    // Fill in the description textarea
    await page.locator('textarea[id=description]').fill('Test constraint');
    await page.selectOption('#constraintTypes', 'Range');
    // Adding lowebound value '1'
    await page.fill('#lowerbound', '1');
    // Adding upperbound value '5'
    await page.fill('#upperbound', '5');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Click on save button
    await page.click('#save');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Constraint "${constraint}" saved.`
    );
    await toast.locator('button').click(); // Close the toast
}

async function findRangeConstraint(page, constraint) {
    // Search for the constraint
    await page.locator('#constraints-search').fill(constraint);
    // Get the row
    const row = page.locator('[id^=constraints-row-]');
    await expect(row).toHaveCount(1);
    // Get the index of the constraint
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check the values
    await expect(page.locator(`#constraints-name-${index}`)).toHaveText(constraint);
    await expect(page.locator(`#constraints-description-${index}`)).toHaveText(
        'Test constraint'
    );
    await expect(page.locator(`#constraints-formalDescription-${index}`)).toHaveText(
        'The value must be between 1 (including) and 5 (including).');
}

async function editRangeDescription(page, constraint) {
    await page.waitForLoadState('load');
    await page
        .locator('textarea[id=description]')
        .fill('Test constraint edited');
        // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    await page.locator('input[id=name]').fill(constraint);

    // Edit lowebound value '5'
    await page.fill('#lowerbound', '5');

    // Edit upperbound value '10'
    await page.fill('#upperbound', '10');
    await page.locator('button[id=save]').click();
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Constraint "${constraint}" saved.`
    );
    await toast.locator('button').click(); // Close the toast
}

async function findEditedRangeConstraint(page, constraint) {

    // Search for the constraint
    await page.locator('#constraints-search').fill(constraint);
    // Get the row
    const row = page.locator('[id^=constraints-row-]');
    await expect(row).toHaveCount(1);
    // Get the index of the constraint
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check the values
    await expect(page.locator(`#constraints-name-${index}`)).toHaveText(constraint);
    await expect(page.locator(`#constraints-description-${index}`)).toHaveText(
        'Test constraint edited'
    );
    await expect(page.locator(`#constraints-formalDescription-${index}`)).toHaveText(
        'The value must be between 5 (including) and 10 (including).');

}

module.exports = {

    createRangeConstraint,
    checkRangeConstraint,
    findRangeConstraint,
    editRangeDescription,
    findEditedRangeConstraint
};

