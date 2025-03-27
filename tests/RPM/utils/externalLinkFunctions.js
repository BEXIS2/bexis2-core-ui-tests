import { expect } from "@playwright/test";


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
        const saveButton = page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'External link created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }

   
}

async function findExternalLink(page, linkName) {
    
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Search for the variable
    await page.locator('#ExternalLinks-search').fill(linkName);
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
    await expect(page.locator(`#ExternalLinks-name-${index}`)).toHaveText(linkName);
    await expect(page.locator(`#ExternalLinks-uri-${index}`)).toHaveText(
        'test@testing.com'
    );
}

async function deleteExternalLink(page) {
    // Click on the delete button
    await page.locator('[id^=delete-]').click();

    // Wait until the modal appears
    await page.waitForSelector('.modal');

    // Check the modal title and body text
    await expect(page.locator('.modal-header')).toContainText('Delete External Link');
    await expect(page.locator('.modal-body')).toContainText(`Are you sure you wish to delete external link`);

    // Click the confirm button in the modal footer
    await page.locator('.modal-footer button.variant-filled').click();
    // Wait for 750 milliseconds
    await page.waitForTimeout(750);
    await page.reload()

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
    const saveButton = page.locator('button#save').click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'External link created.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();
}

async function editExternalLink(page, linkName) {

    // Click on the delete button
    await page.locator('[id^=edit-]').click();
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    await page.locator('input[id=name]').fill(linkName);

    await page.locator('input[id=uri]').fill('testing');
    await page.waitForTimeout(500);
    // Check if the save button is enable and reload the page
    const saveButton = page.locator('button#save').click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'External link updated.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();
   
}

async function findEditedExternalLink(page, linkName) {

    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Search for the variable
    await page.locator('#ExternalLinks-search').fill(linkName);
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
    await expect(page.locator(`#ExternalLinks-name-${index}`)).toHaveText(linkName);
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    await expect(page.locator(`#ExternalLinks-uri-${index}`)).toHaveText(
        'testing'
    );

}

module.exports = {
    checkExternalLink,
    findExternalLink,
    deleteExternalLink,
    createExternalLink,
    editExternalLink,
    findEditedExternalLink
};