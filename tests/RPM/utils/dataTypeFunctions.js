import { expect } from "@playwright/test";




async function checkDataTypes(page, dataType, hasDescription, hasSystemType) {
    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);

    // Fill in the name and description if provided
    if (dataType) {
        await page.locator('input[id=name]').fill(dataType);
    }
    if (hasDescription) {
        await page.locator('textarea[id=description]').fill('Test data type');
    }

    // Select 'data type' option from dropdown if hasSystemType is true
    if (hasSystemType) {
        await page.selectOption('#systemType', hasSystemType);
    }
    // Handling different conditions based on parameters
    if (!dataType && !hasDescription && hasSystemType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()

    }
    else if (dataType && !hasDescription && hasSystemType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();

    }
    else if (!dataType && hasDescription && hasSystemType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();

    }
    else if (dataType && hasDescription && !hasSystemType) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);

        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = `Can't save data type "${dataType}" .No System Type selected`;
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }

}
async function createDataType(page, dataType, systemType) {

    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(1000);
    // Click on the create button
    await page.locator('#create').click();
    // Wait for 500 milliseconds
    await page.waitForTimeout(1000);
    // Fill in the name input
    await page.locator('input[id=name]').fill(dataType);

    // Fill in the description textarea
    await page.locator('textarea[id=description]').fill('Test data type');

    // Select an option from dropdown
    await page.selectOption('#systemType', systemType);

    // Wait for 500 milliseconds
    await page.waitForTimeout(1000);

    // Click on save button
    await page.click('#save');

    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Data type "${dataType}" saved.`
    );

    // Close the toast
    await toast.locator('button').click();
}

async function findDataType(page, dataType) {
    // Search for the data type
    await page.locator('#dataTypes-search').fill(dataType);

    // Get the row
    const row = page.locator('[id^=dataTypes-row-]');
    await expect(row).toHaveCount(1);

    // Get the index of the data type
    const id = await row.getAttribute('id');
    const index = id.split('-')[2];

    // Check the values
    await expect(page.locator(`#dataTypes-name-${index}`)).toHaveText(dataType);
    await expect(page.locator(`#dataTypes-description-${index}`)).toHaveText(
        'Test data type'
    );
}

async function deleteDataType(page, dataType) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Search for the data type
    await page.locator('#dataTypes-search').fill(dataType);
    // Click on the delete button
    await page.locator('[id^=delete-]').click();

    // Wait until the modal appears
    await page.waitForSelector('.modal');

    // Check the modal title and body text
    await expect(page.locator('.modal-header')).toHaveText('Delete Data Type');
    await expect(page.locator('.modal-body')).toHaveText(`Are you sure you wish to delete Data Type "${dataType}" (Empty)?`);

    // Click the confirm button in the modal footer
    await page.locator('.modal-footer button.variant-filled').click();
    await page.waitForLoadState('load');


}
async function checkAndCloseToast(page, dataType) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(`Data Type "${dataType}" deleted.`);

    // Close the toast
    await toast.locator('button').click();
}
async function editDataTypeDescription(page, dataType) {

    await page
        .locator('textarea[id=description]')
        .fill('Test data type edited');
    await page.locator('input[id=name]').fill(dataType);
    await page.locator('button[id=save]').click();

    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Data type "${dataType}" saved.`
    );
    await toast.locator('button').click(); // Close the toast
}

async function findEditedDataType(page, dataType) {

    // Search for the data type
    await page.locator('#dataTypes-search').fill(dataType);
    // Get the row
    const row = page.locator('[id^=dataTypes-row-]');
    await expect(row).toHaveCount(1);
    // Get the index of the data type
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check the values
    await expect(page.locator(`#dataTypes-name-${index}`)).toHaveText(dataType);
    await expect(page.locator(`#dataTypes-description-${index}`)).toHaveText(
        'Test data type edited'
    );
}



module.exports = {
    checkDataTypes,
    createDataType,
    findDataType,
    deleteDataType,
    checkAndCloseToast,
    editDataTypeDescription,
    findEditedDataType
};