import { expect } from "@playwright/test";


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
        const saveButton = page.locator('button#save').click();
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

    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Search for the variable
    await page.locator('#ExternalLinks-search').fill(prefixName);
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Click on the Search button
    await page.click('form.flex > button:nth-child(2)');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Locate the correct row
    const row = page.locator('[id^=ExternalLinks-row-]');
    await expect(row).toHaveCount(1);
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Get the index of the row
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check values for the row
    await expect(page.locator(`#ExternalLinks-name-${index}`)).toHaveText(prefixName);
   
}

async function deletePrefix(page) {
    // Click on the delete button
    await page.locator('[id^=delete-]').click();

    // Wait until the modal appears
    await page.waitForSelector('.modal');

    // Check the modal title and body text
    await expect(page.locator('.modal-header')).toHaveText('Delete Prefix Category');
    await expect(page.locator('.modal-body')).toContainText(`Are you sure you wish to delete Prefix Category ?`);

    // Click the confirm button in the modal footer
    await page.locator('.modal-footer button.variant-filled').click();
    // Wait for 750 milliseconds
    await page.waitForTimeout(750);
    await page.reload()

}

async function createPrefix(page, prefixName) {

    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);
    // Fill in the name and description if provided

    await page.locator('input[id=name]').fill(prefixName);

    await page.locator('input[id=description]').fill("Test description");

    // Check if the save button is enable and reload the page
    const saveButton = page.locator('button#save').click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'Prefix Category created.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();
}

async function editPrefix(page,prefixName) {

    // Click on the delete button
    await page.locator('[id^=edit-]').click();
    await page.locator('input[id=name]').fill(prefixName);
    // Wait for 500 milliseconds
    await page.locator('input[id=description]').fill("Edit description");
    await page.waitForTimeout(500);
    // Check if the save button is enable and reload the page
    const saveButton = page.locator('button#save').click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'Prefix Category updated.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();

}

async function findEditedPrefix(page, prefixName) {

    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Search for the variable
    await page.locator('#ExternalLinks-search').fill(prefixName);
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Click on the Search button
    await page.click('form.flex > button:nth-child(2)');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Locate the correct row
    const row = page.locator('[id^=ExternalLinks-row-]');
    await expect(row).toHaveCount(1);
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Get the index of the row
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check values for the row
    await expect(page.locator(`#ExternalLinks-name-${index}`)).toHaveText(prefixName);
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    await expect(page.locator(`#ExternalLinks-description-${index}`)).toHaveText(
        'Edit description'
    );

}

module.exports = {
    checkPrefix,
    findPrefix,
    deletePrefix,
    createPrefix,
    editPrefix,
    findEditedPrefix
};