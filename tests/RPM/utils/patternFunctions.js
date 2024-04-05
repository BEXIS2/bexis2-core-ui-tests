import { expect } from '@playwright/test';
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
async function checkPatternConstraint(page, constraint, hasDescription, hasPatternType, hasExpInput) {
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

    // Select 'Pattern' option from dropdown if hasPatternType is true
    if (hasPatternType) {
        await page.selectOption('#constraintTypes', 'Pattern');
    }
    // Add 'Console input' if hasConsoleinput is true
    if (hasExpInput) {
        await page.waitForTimeout(500);
        // Click on the div to focus
        await page.click('div.cm-activeLine.cm-line');
        // Type the text
        await page.keyboard.type('Hello Pattern');
        // Wait for 500 milliseconds
        await page.waitForTimeout(500);
    }

    // Handling different conditions based on parameters
    if (!constraint && !hasDescription && hasPatternType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()
        // Set the value
        handler.constraintDelete = true;
    }
    else if (constraint && !hasDescription && hasPatternType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();
        // Set the value
        handler.constraintDelete = true;
    }
    else if (!constraint && hasDescription && hasPatternType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();
        // Set the value
        handler.constraintDelete = true;
    }
    else if (constraint && hasDescription && hasPatternType) {
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
        handler.constraintDelete = true;
        await page.reload();
        //  await page.reload();
        await deleteConstraint(page, constraint);
        await checkAndCloseToast(page, constraint);
    }
    else if (!constraint && !hasDescription && hasPatternType && hasExpInput) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();
        // Set the value
        handler.constraintDelete = true;
    }
}

async function createPatternConstraint(page, constraint) {
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

    await page.selectOption('#constraintTypes', 'Pattern');
    // Click on the div to focus
    await page.click('div.cm-activeLine.cm-line');
    // Type the text
    await page.keyboard.type('Hello Pattern');
    // Click on example and type test data 
    await page.click('#example');
    await page.type('#example', 'Hello, I am Tester');
    await page.waitForTimeout(500); // waits for 500 milliseconds
    // Click on save button
    await page.click('#save');
    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Constraint "${constraint}" saved.`
    );
    await toast.locator('button').click(); // Close the toast
}

async function findPatternConstraint(page, constraint) {
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
    // The expected text to be found on the webpage
    const expectedText = "The value must match this pattern: 'Hello Pattern'. The matching is case sensitive.";
    // Check if the locator's text matches the expected text
    await expect(page.locator(`#constraints-formalDescription-${index}`)).toHaveText(expectedText);

}

async function editPatternDescription(page, constraint) {
    await page.waitForLoadState('load');
    await page
        .locator('textarea[id=description]')
        .fill('Test constraint edited');
         // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    await page.locator('input[id=name]').fill(constraint);
    await page.locator('textarea[id=description]').fill('Test edited pattern constraint');
    // Click on the div to focus
    await page.click('div.cm-activeLine.cm-line');
    // Type the text
    await page.keyboard.type(' Edited');
    // Wait for 250 milliseconds
    await page.waitForTimeout(250);
    await page.click('#example');
    await page.type('#example', 'Hello, I am updated Tester');
    await page.locator('button[id=save]').click();
    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Constraint "${constraint}" saved.`
    );
    await toast.locator('button').click(); // Close the toast
}

async function findEditedPatternConstraint(page, constraint) {

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
        'Test edited pattern constraint'
    );
    // The expected text to be found on the webpage
    const expectedText = "The value must match this pattern: 'Hello Pattern Edited'. The matching is case sensitive.";
    // Check if the locator's text matches the expected text
    await expect(page.locator(`#constraints-formalDescription-${index}`)).toHaveText(expectedText);
}

module.exports = {
    checkPatternConstraint,
    createPatternConstraint,
    findPatternConstraint,
    editPatternDescription,
    findEditedPatternConstraint
};

