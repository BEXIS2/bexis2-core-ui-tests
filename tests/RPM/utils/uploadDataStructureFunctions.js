import { expect } from "@playwright/test";


async function checkUploadDataStructure(page, hasEmptyData, hasVariables, hasVariablesAndUnit, hasVariablesUnitAndMissingValues) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Click on the create button
    await page.locator('#create').click();
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Wait for the file input to be present in the DOM
    await page.locator('input[accept=".csv,.txt,.tsv"]');


    if (hasEmptyData == "isEmpty") {

        const path = require('path');
        const filePath = path.resolve(__dirname, 'Empty_data.csv');  // This resolves the file path from the current folder
        await page.setInputFiles('input[type="file"]', filePath);
        // Wait for 2000 milliseconds
        await page.waitForTimeout(2000);

    }

    if (hasVariables == "hasVariables") {

        const path = require('path');
        const filePath = path.resolve(__dirname, 'Has_variables.csv');  // This resolves the file path from the current folder
        await page.setInputFiles('input[type="file"]', filePath);
        // Wait for 2000 milliseconds
        await page.waitForTimeout(2000);

    }

    if (hasVariablesAndUnit == "hasVariablesAndUnit") {

        const path = require('path');
        const filePath = path.resolve(__dirname, 'Has_variables_data.csv');  // This resolves the file path from the current folder
        await page.setInputFiles('input[type="file"]', filePath);
        // Wait for 2000 milliseconds
        await page.waitForTimeout(2000);

    }

    if (hasVariablesUnitAndMissingValues == "hasVariablesUnitAndMissingValues") {

        const path = require('path');
        const filePath = path.resolve(__dirname, 'Test_data.csv');  // This resolves the file path from the current folder
        await page.setInputFiles('input[type="file"]', filePath);
        // Wait for 2000 milliseconds
        await page.waitForTimeout(2000);

    }
    
    // Handling different conditions based on parameters
    if (hasEmptyData && !hasVariables && !hasVariablesAndUnit && !hasVariablesUnitAndMissingValues) {
        await navDataStructure (page)
    }

    else if (!hasEmptyData && hasVariables && !hasVariablesAndUnit && !hasVariablesUnitAndMissingValues) {
        // Wait for the table to load
        await page.locator('table.table tbody tr:first-child td:first-child');  // Wait for the first td in the first row

        // Click on the first td in the first row
        await page.click('table.table tbody tr:first-child td:first-child');
        
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectVar');

        // Click on the button
        await page.click('#selectVar');

        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);

        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button[title="save"]');
        await expect(saveButton).toBeDisabled();

    }

    else if (!hasEmptyData && !hasVariables && hasVariablesAndUnit && !hasVariablesUnitAndMissingValues) {
        // Wait for the table to load
        await page.locator('table.table tbody tr:first-child td:first-child');  // Wait for the first td in the first row

        // Click on the first td in the first row
        await page.click('table.table tbody tr:first-child td:first-child');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectVar');

        // Click on the button
        await page.click('#selectVar');

        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForSelector('table.table tbody tr:nth-child(2) td:first-child');

        // Click on the first <td> in the second row
        await page.click('table.table tbody tr:nth-child(2) td:first-child');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectUnit');

        // Click on the button
        await page.click('#selectUnit');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);

        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button[title="save"]');
        await expect(saveButton).toBeDisabled();

    }

    else if (!hasEmptyData && !hasVariables && !hasVariablesAndUnit && hasVariablesUnitAndMissingValues) {
        // Wait for the table to load
        await page.locator('table.table tbody tr:first-child td:first-child');  // Wait for the first td in the first row

        // Click on the first td in the first row
        await page.click('table.table tbody tr:first-child td:first-child');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectVar');

        // Click on the button
        await page.click('#selectVar');

        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForSelector('table.table tbody tr:nth-child(2) td:first-child');

        // Click on the first <td> in the second row
        await page.click('table.table tbody tr:nth-child(2) td:first-child');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectUnit');

        // Click on the button
        await page.click('#selectUnit');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForSelector('table.table tbody tr:nth-child(3) td:first-child');

        // Click on the first <td> in the second row
        await page.click('table.table tbody tr:nth-child(3) td:first-child');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        // Wait for the button with the id 'selectVar' to be present in the DOM
        await page.waitForSelector('#selectMissingValues');

        // Click on the button
        await page.click('#selectMissingValues');
        // Wait for 250 milliseconds
        await page.waitForTimeout(250);

        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);

        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button[title="save"]');
        await expect(saveButton).toBeDisabled();

    }
}

async function uploadDataStructure(page, titleName) {

    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Click on the create button
    await page.locator('#create').click();
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Wait for the file input to be present in the DOM
    await page.locator('input[accept=".csv,.txt,.tsv"]');

    const path = require('path');
    const filePath = path.resolve(__dirname, 'Test_data.csv');  // This resolves the file path from the current folder

    await page.setInputFiles('input[type="file"]', filePath);
    // Wait for 2000 milliseconds
    await page.waitForTimeout(2000);

    // Wait for the table to load
    await page.locator('table.table tbody tr:first-child td:first-child');  // Wait for the first td in the first row

    // Click on the first td in the first row
    await page.click('table.table tbody tr:first-child td:first-child');
    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    // Wait for the button with the id 'selectVar' to be present in the DOM
    await page.waitForSelector('#selectVar');

    // Click on the button
    await page.click('#selectVar');

    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    await page.waitForSelector('table.table tbody tr:nth-child(2) td:first-child');

    // Click on the first <td> in the second row
    await page.click('table.table tbody tr:nth-child(2) td:first-child');
    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    // Wait for the button with the id 'selectVar' to be present in the DOM
    await page.waitForSelector('#selectData');

    // Click on the button
    await page.click('#selectData');
    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    await page.waitForSelector('table.table tbody tr:nth-child(3) td:first-child');

    // Click on the first <td> in the second row
    await page.click('table.table tbody tr:nth-child(3) td:first-child');
    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    // Wait for the button with the id 'selectVar' to be present in the DOM
    await page.waitForSelector('#selectDescription');

    // Click on the button
    await page.click('#selectDescription');
    // Wait for 250 milliseconds
    await page.waitForTimeout(250);

    // Wait for the button with the title "save" to appear
    await page.waitForSelector('button[title="save"]');

    // Click the button with title="save"
    await page.click('button[title="save"]');

    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // Fill in the title input
    await page.locator('input[id=title]').fill(titleName);

    // Fill in the title description textarea
    await page.locator('textarea[id=description]').fill('Test data structure');

    // Click on make a part of primary key 
    await page.click('xpath=//*[@id="0"]/div[2]/div[1]/div[2]/label/div');

    // Click on save button
    await page.click('#save');
}

async function findDataStructure(page, dataStructure) {
    // Search for the data structure
    await page.locator('#datastructure-search').fill(dataStructure);

    // Click on the Search button
    await page.click('#datastructure-searchSubmit');

    // Get the row
    const row = page.locator('[id^=datastructure-row-]');
    await expect(row).toHaveCount(1);

    // Get the index of the data structure
    const id = await row.getAttribute('id');
    const index = id.split('-')[2];

    // Check the values
    await expect(page.locator(`#datastructure-title-${index}`)).toHaveText(dataStructure);
    await expect(page.locator(`#datastructure-description-${index}`)).toHaveText(
        'Test data structure'
    );
}

async function deleteDataStructure(page) {
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    await page.locator('[id^=delete-]').click();

    // Wait until the modal appears
    await page.waitForSelector('.modal');

    // Check the modal title and body text
    await expect(page.locator('.modal-header')).toHaveText('Delete Structure');
    await expect(page.locator('.modal-body')).toContainText(`Are you sure you wish to delete structure`);

    // Click the confirm button in the modal footer
    await page.locator('.modal-footer button.variant-filled').click();
    await page.waitForLoadState('load');

}
async function checkAndCloseToast(page) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toContainText(`Structure`);

    // Close the toast
    await toast.locator('button').click();
}


async function navDataStructure(page) {

    // Click on the div element
    await page.click('div.hidden:nth-child(4)');
    await page.waitForSelector('text="Manage Data Structures"', { visible: true });

    // Click on the div element
    await page.click('text="Manage Data Structures"');
}


async function editDataStructure(page) {

    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    await page.locator('[id^=edit-]').click();
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);


    // Fill in the title description textarea
    await page.locator('textarea[id=description]').fill('Edited test data structure');

    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // Click on optional value
    await page.click('xpath=//*[@id="0"]/div[2]/div[2]/div[2]/label/div');

   // Click the on template data dropdown
   await page.click('#variableTemplate-0');
   await page.waitForTimeout(500);
   const template = await page.waitForSelector('.list-item .item:text("percentage")', { visible: true, enabled: true });
   await template.click()

   // Click the on data type dropdown
   await page.click('#dataType-0');
   await page.waitForTimeout(500);
   const dataType = await page.waitForSelector('.list-item .item:text("number")', { visible: true, enabled: true });
   await dataType.click()

   // Click the on unit dropdown
   await page.click('#unit-0');
   await page.waitForTimeout(500);
   const unit = await page.waitForSelector('.list-item .item:text("%")', { visible: true, enabled: true });
   await unit.click()
   await page.waitForTimeout(500);

    // Click on save button
    await page.locator('button[title="save"]').click();

}

async function findEditedDataStructure(page, dataStructure) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Search for the data structure
    await page.locator('#datastructure-search').fill(dataStructure);

    // Click on the Search button
    await page.click('#datastructure-searchSubmit');

    // Get the row
    const row = page.locator('[id^=datastructure-row-]');
    await expect(row).toHaveCount(1);

    // Get the index of the data structure
    const id = await row.getAttribute('id');
    const index = id.split('-')[2];

    // Check the values
    await expect(page.locator(`#datastructure-title-${index}`)).toHaveText(dataStructure);
    await expect(page.locator(`#datastructure-description-${index}`)).toHaveText(
        'Edited test data structure'
    );
}


module.exports = {

    uploadDataStructure,
    findDataStructure,
    deleteDataStructure,
    checkAndCloseToast,
    navDataStructure,
    editDataStructure,
    findEditedDataStructure,
    checkUploadDataStructure

};