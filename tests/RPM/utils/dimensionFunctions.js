import { expect } from "@playwright/test";

async function checkDimension(page, dName, hasSpecification, hasDescription) {
    await page.waitForLoadState('load');
    await page.locator('#create').click();
    await page.waitForTimeout(1000);

    // Fill in the name and description if provided
    if (dName) {
        await page.locator('input[id=name]').fill(dName);
    }
    if (hasSpecification) {
        await page
            .locator('input[id=specification]')
            .fill('L(0,0)M(0,0)T(0,0)I(0,0)Θ(0,0)N(0,0)J(0,1)');
    }
    if (hasDescription) {
        await page.locator('textarea[id=description]').fill('Test Dimension');

    }

    // Handling different conditions based on parameters
    if (dName && hasSpecification && !hasDescription) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()

    }
    // Handling different conditions based on parameters
    else if (dName && !hasSpecification && hasDescription) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()

    }
    // Handling different conditions based on parameters
    else if (dName && !hasSpecification && !hasDescription) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()
    }
    // Handling different conditions based on parameters
    else if (!dName && hasSpecification && hasDescription) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()
    }
}
async function createDimension(page, dimension) {

    await page.locator('#create').click();
    await page.locator('input[id=name]').fill(dimension);
    await page
        .locator('input[id=specification]')
        .fill('L(0,0)M(0,0)T(0,0)I(0,0)Θ(0,0)N(0,0)J(0,1)');
    await page.locator('textarea[id=description]').fill('Test dimension');
    await page.locator('button[id=save]').click();

    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Unit "${dimension}" saved.`
    );
    await toast.locator('button').click(); // Close the toast
}
async function findNewDimension(page, dimension) {

    // Search for the new dimension
    await page.locator('#dimensions-search').fill(dimension);

    // Click on the Search button
    await page.click('.table-container > div:nth-child(1) > button:nth-child(2)');

    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    const row = page.locator('[id^=dimensions-row-]');
    await expect(row).toHaveCount(1);
    // Get the index of the dimension
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check the values
    await expect(page.locator(`#dimensions-name-${index}`)).toHaveText(dimension);
    await expect(page.locator(`#dimensions-description-${index}`)).toHaveText(
        'Test dimension'
    );
    await expect(page.locator(`#dimensions-specification-${index}`)).toHaveText(
        'L(0,0)M(0,0)T(0,0)I(0,0)Θ(0,0)N(0,0)J(0,1)'
    );

}

async function deleteDimension(page, dimension) {

    // Click on the delete button
    await page.locator('[id^=delete-]').click();

    // Wait until the modal appears
    await page.waitForSelector('.modal');

    // Check the modal title
    await expect(page.locator('.modal-header')).toHaveText('Delete Unit');
    await expect(page.locator('.modal-body')).toHaveText(
        `Are you sure you wish to delete Dimension "${dimension}" (L(0,0)M(0,0)T(0,0)I(0,0)Θ(0,0)N(0,0)J(0,1))?`
    );

    // Click Confirm
    await page
        .locator('.modal-footer')
        .locator('button.variant-filled')
        .click();
}
async function checkAndCloseToast(page, dimension) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(`Dimension "${dimension}" deleted.`);

    // Close the toast
    await toast.locator('button').click();
    await page.reload()
}
async function editDimensionDes(page, dimension) {

    await page
        .locator('textarea[id=description]')
        .fill('Test dimension edited');
    await page.locator('input[id=name]').fill(dimension);
    await page
        .locator('input[id=specification]')
        .fill('L(0,0)M(0,0)T(0,0)I(0,0)Θ(0,0)N(0,0)J(0,1)');
    await page.locator('button[id=save]').click();

    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Unit "${dimension}" saved.`
    );
    await toast.locator('button').click(); // Close the toast

}
async function findEditedDimension(page, dimension) {
    // Search for the dimension
    await page.locator('#dimensions-search').fill(dimension);
    // Get the row
    const row = page.locator('[id^=dimensions-row-]');
    await expect(row).toHaveCount(1);
    // Get the index of the dimension
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check the values
    await expect(page.locator(`#dimensions-name-${index}`)).toHaveText(dimension);
    await expect(page.locator(`#dimensions-description-${index}`)).toHaveText(
        'Test dimension edited'
    );
    await expect(page.locator(`#dimensions-specification-${index}`)).toHaveText(
        'L(0,0)M(0,0)T(0,0)I(0,0)Θ(0,0)N(0,0)J(0,1)'
    );
}
module.exports = {
    checkDimension,
    createDimension,
    findNewDimension,
    deleteDimension,
    checkAndCloseToast,
    editDimensionDes,
    findEditedDimension

};
