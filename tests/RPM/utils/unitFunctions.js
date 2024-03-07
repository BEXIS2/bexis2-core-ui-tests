import { expect } from "@playwright/test";


async function checkUnits(page, unitName, hasAbbreviation, hasDescription, hasDataType, hasDimension, hasMeasureSystem) {
    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);

    // Fill in the name and description if provided
    if (unitName) {
        await page.locator('input[id=name]').fill(unitName);
    }
    if (hasDescription) {
        await page.locator('textarea[id=description]').fill('Test Unit');
    }

    if (hasAbbreviation) {
        // Fill in Abbreviation
        await page.locator('input[id=abbreviation]').fill(hasAbbreviation);

    }
    if (hasDataType) {
        // Select Data Types
        await page.locator('.svelte-select.multi').click();
        await page.locator('.list-item .item.first').click();


    }

    if (hasDimension) {
        // Select Dimension
        await page.locator('select[id=dimension]').selectOption('1');


    }
    if (hasMeasureSystem) {
        // Select Measurement System
        await page.locator('.radio-item:has-text("Unknown")').click();


    }

    // Handling different conditions based on parameters
    if (unitName && hasDescription && hasAbbreviation && !hasMeasureSystem && !hasDimension && !hasDataType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()

    }
    else if (unitName && hasDescription && hasAbbreviation && hasDataType && !hasDimension && !hasMeasureSystem) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();

    }
    else if (unitName && hasDescription && hasAbbreviation && !hasDataType && hasDimension && !hasMeasureSystem) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();

    }
    else if (unitName && !hasDescription && hasAbbreviation) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();

    }
    else if (unitName && hasDescription && !hasAbbreviation) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();
    }
    else if (unitName && hasDescription && hasAbbreviation && hasMeasureSystem && !hasDimension && !hasDataType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);

        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = `Can't save Unit "${unitName}" (${hasAbbreviation}).Choose at least one Data TypeSelect an Dimension`;
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }
    else if (unitName && hasDescription && hasAbbreviation && hasMeasureSystem && hasDimension && !hasDataType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);

        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = `Can't save Unit "${unitName}" (${hasAbbreviation}).Choose at least one Data Type`;
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }
    else if (unitName && hasDescription && hasAbbreviation && hasMeasureSystem && !hasDimension && hasDataType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);

        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = `Can't save Unit "${unitName}" (${hasAbbreviation}).Select an Dimension`;
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }

}
async function createUnit(page, unit) {

    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(1000);
    // Click on the create button
    await page.locator('#create').click();
    // Fill in Name
    await page.locator('input[id=name]').fill(unit);
    // Fill in Abbreviation
    await page.locator('input[id=abbreviation]').fill(unit);
    // Fill in Description
    await page.locator('textarea[id=description]').fill('Test description');
    // Select Data Types
    await page.locator('.svelte-select.multi').click();
    await page.locator('.list-item .item.first').click();
    // Select Dimension
    await page.locator('select[id=dimension]').selectOption('1');
    // Select Measurement System
    await page.locator('.radio-item:has-text("Unknown")').click();
    // Save
    await page.locator('button[id=save]').click();

    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Unit "${unit}" (${unit}) saved.`
    );
    await toast.locator('button').click(); // Close the toast
}

async function findNewUnit(page, unit) {
    // Search for the new unit
    await page.locator('#Units-search').fill(unit);
    // Locate the correct row
    const row = page.locator('[id^=Units-row-]');
    await expect(row).toHaveCount(1);
    // Get the index of the row
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check values for the row
    await expect(page.locator(`#Units-name-${index}`)).toHaveText(unit);
    await expect(page.locator(`#Units-description-${index}`)).toHaveText(
        'Test description'
    );
    await expect(page.locator(`#Units-abbreviation-${index}`)).toHaveText(
        unit
    );
    await expect(page.locator(`#Units-dimension-${index}`)).toHaveText(
        'none'
    );
    await expect(page.locator(`#Units-datatypes-${index}`)).toHaveText(
        'string'
    );
    await expect(
        page.locator(`#Units-measurementSystem-${index}`)
    ).toHaveText('Unknown');

}
async function checkAndCloseToast(page, unit) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(`Unit "${unit}" (${unit}) deleted.`);

    // Close the toast
    await toast.locator('button').click();
}
async function deleteUnit(page, unit) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // // Search for the Unit
    // await page.locator('#units-search').fill(unit);
    await page.locator('[id^=delete-]').click(); // Click on the delete button

    // Wait until the modal appears
    await page.waitForSelector('.modal');

    // Check the modal title
    await expect(page.locator('.modal-header')).toHaveText('Delete Unit');
    await expect(page.locator('.modal-body')).toHaveText(
        `Are you sure you wish to delete Unit "${unit}" (${unit})?`
    );

    // Click Confirm
    await page
        .locator('.modal-footer')
        .locator('button.variant-filled')
        .click();


}

async function editUnitDescription(page, unit) {

    await page
        .locator('textarea[id=description]')
        .fill('Test unit edited');
    await page.locator('input[id=name]').fill(unit);
    await page.locator('button[id=save]').click();

    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Unit "${unit}" (${unit}) saved.`
    );
    await toast.locator('button').click(); // Close the toast
}

async function findEditedUnit(page, unit) {

    //   Search for the new unit
    await page.locator('#Units-search').fill(unit);
    // Locate the correct row
    const row = page.locator('[id^=Units-row-]');
    await expect(row).toHaveCount(1);
    // Get the index of the row
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check values for the row
    await expect(page.locator(`#Units-name-${index}`)).toHaveText(unit);
    await expect(page.locator(`#Units-description-${index}`)).toHaveText(
        'Test description'
    );
    await expect(page.locator(`#Units-abbreviation-${index}`)).toHaveText(
        unit
    );
    await expect(page.locator(`#Units-dimension-${index}`)).toHaveText(
        'none'
    );
    await expect(page.locator(`#Units-datatypes-${index}`)).toHaveText(
        'string'
    );
    await expect(
        page.locator(`#Units-measurementSystem-${index}`)
    ).toHaveText('Unknown');

}



module.exports = {
    checkUnits,
    createUnit,
    findNewUnit,
    deleteUnit,
    checkAndCloseToast,
    editUnitDescription,
    findEditedUnit
};
