import { expect } from "@playwright/test";

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

async function checkDomainConstraint(page, constraint, hasDescription, hasDomainType, hasConsoleInput) {
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

    // Select 'Domain' option from dropdown if hasDomainType is true
    if (hasDomainType) {
        await page.selectOption('#constraintTypes', 'Domain');
    }
    // Add 'Console input' if hasConsoleinput is true
    if (hasConsoleInput) {
        await page.waitForTimeout(500);
        // Type the text
        await page.keyboard.type('Hello Testing Domain');
        // Wait for 500 milliseconds
        await page.waitForTimeout(500);
    }

    // Handling different conditions based on parameters
    if (!constraint && !hasDescription && hasDomainType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()
        // Set the value
        handler.constraintDelete = true;
    }
    else if (constraint && !hasDescription && hasDomainType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();
        // Set the value
        handler.constraintDelete = true;
    }
    else if (!constraint && hasDescription && hasDomainType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();
        // Set the value
        handler.constraintDelete = true;
    }
    else if (constraint && hasDescription && hasDomainType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Click on save button and wait for toast message
        await page.click('#save');
        // Set the value
        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');
        let expectedMessage = `Can't save Constraint "${constraint}"`;

        if (!hasDomainType) {
            expectedMessage += " .no Constraint Type is chosen";
        } else if (constraint && hasDescription && hasDescription) {
            expectedMessage += " .Domain is not defined";
        }

        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        handler.constraintDelete = true;
        await page.reload();
    }
    else if (!constraint && !hasDescription && hasDomainType && hasConsoleInput) {
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

async function createDomainConstraint(page, constraint) {

    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(1000);
    // Click on the create button
    await page.locator('#create').click();
    // Wait for 500 milliseconds
    await page.waitForTimeout(1000);
    // Fill in the name input
    await page.locator('input[id=name]').fill(constraint);

    // Fill in the description textarea
    await page.locator('textarea[id=description]').fill('Test constraint');

    // Select an option from dropdown
    await page.selectOption('#constraintTypes', 'Domain');

    // Click on the div to focus
    await page.click('div.cm-activeLine.cm-line');
    // Wait for 500 milliseconds
    await page.waitForTimeout(1000);

    // Type the text
    await page.keyboard.type('Hello Testing Domain');

    // Wait for 500 milliseconds
    await page.waitForTimeout(1000);

    // Click on save button
    await page.click('#save');

    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Constraint "${constraint}" saved.`
    );

    // Close the toast
    await toast.locator('button').click();
}

async function findDomainConstraint(page, constraint) {
    // Search for the constraint
    await page.locator('#constraints-search').fill(constraint);
    // Click on the Search button
    await page.click('#constraints-searchSubmit');
    // Get the row
    const row = page.locator('[id^=constraints-row-]');
    await expect(row).toHaveCount(1);

    // Get the index of the constraint
    const id = await row.getAttribute('id');
    const index = id.split('-')[2];

    // Check the values
    await expect(page.locator(`#constraints-name-${index}`)).toHaveText(constraint);
    await expect(page.locator(`#constraints-description-${index}`)).toHaveText(
        'Test constraint'
    );
    await expect(page.locator(`#constraints-formalDescription-${index}`)).toHaveText(
        'The value must be one of these items: Hello Testing Domain.'
    );
}

async function editDomainDescription(page, constraint) {
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);
    // Fill in the edited description
    await page.locator('textarea[id=description]').fill('Test edited domain constraint');

    // Click on the div to focus
    await page.click('div.cm-activeLine.cm-line');

    // Type additional text
    await page.keyboard.type(' Edited');

    // Wait for 500 milliseconds
    await page.waitForTimeout(1000);

    // Click on save button
    await page.locator('button[id=save]').click();

    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(`Constraint "${constraint}" saved.`);

    // Close the toast
    await toast.locator('button').click();
}


async function findEditedDomainConstraint(page, constraint) {

    // Search for the constraint
    await page.locator('#constraints-search').fill(constraint);
    // Click on the Search button
    await page.click('#constraints-searchSubmit');
    // Get the row
    const row = page.locator('[id^=constraints-row-]');
    await expect(row).toHaveCount(1);

    // Get the index of the constraint
    const id = await row.getAttribute('id');
    const index = id.split('-')[2];

    // Check the values
    await expect(page.locator(`#constraints-name-${index}`)).toHaveText(constraint);
    await expect(page.locator(`#constraints-description-${index}`)).toHaveText('Test edited domain constraint');
    await expect(page.locator(`#constraints-formalDescription-${index}`)).toHaveText('The value must be one of these items: Hello Testing Domain Edited.');
}


module.exports = {
    createDomainConstraint,
    findDomainConstraint,
    checkDomainConstraint,
    editDomainDescription,
    findEditedDomainConstraint
};