import { expect } from "@playwright/test";
const path = require('path');

async function createNewtabularData(page, title,description) {
    await page.waitForTimeout(500)
    //click on the tabular data tab
    await page.locator('.pr-1 > :nth-child(1)').click()
    // Select the New tabular data element header and verify its visibility
    const headerElement = page.locator('.h2');
    await expect(headerElement).toBeVisible();
    await page.locator('#Title').fill(title);
    await page.locator('#Description').fill(description);
      // Wait for 500 milliseconds
      await page.waitForTimeout(500);
      //click on create button
    await page.locator('.flex > .variant-filled-primary').click()
    // verify the visibiliy of the text of the file upload
    await page.waitForTimeout(500)
    const fileuploadtitle = page.locator('.space-y-2 > form > :nth-child(1) > .dropzone > span > :nth-child(1)');
    await  page.waitForSelector('.space-y-2 > form > :nth-child(1) > .dropzone > span > :nth-child(1)');
    await expect(fileuploadtitle).toBeVisible();
          // Wait for 500 milliseconds
          await page.waitForTimeout(500)

}
async function uploadfiles(page){
    const filePath = path.resolve(__dirname, '../../Date_and_time_formats.csv');
    const handle = page.locator('input[type="file"]').nth(0);
    await handle.setInputFiles(filePath);
    // verifyy the alert message for file upload
    const alertsuccess = page.locator('.alert-message > p');
    await expect(alertsuccess).toBeVisible();
    await page.locator('#SelectDataStructure').fill('Date_and_time_formats');
    await page.waitForTimeout(2000)
    await page.locator('#SelectDataStructure').press('Enter');
}

async function markingVariableData(page){

    await page.waitForTimeout(500)
    await page.waitForSelector('#selectVar');
    const title = page.locator('#edit > #title > b');
    await expect(title).toHaveText('Mark at least Variable and Data');
    await page.locator(':nth-child(1) > .w-8').click()
    await page.locator('#selectVar').click()
    await page.locator(':nth-child(2) > .w-8').click()
    await page.locator('#selectData').click()
    await page.waitForTimeout(500)
    await page.locator(':nth-child(8) > .btn').click()
    // await page.waitForTimeout(10000)
}

async function EnterTitleandDesc(page,title,desc){
    await page.waitForTimeout(500)
    //verify the primary key alert message
    const alertmsg = page.locator('.alert-message > p');
    await  page.waitForSelector('.alert-message > p');
    await expect(alertmsg).toHaveText('Please select a (combined) primary key.');
    await page.waitForTimeout(500)
    await page.locator('#title').fill(title);
    await page.locator(':nth-child(2) > #description-container > .label > #description').fill(desc);
}

async function AssignDataTypeDisplayPattern(page,getindex,datatype,displaypattern){
    await page.waitForTimeout(500)
    const index = getindex; // Ensure this has a valid value
    const setDesc = await page.locator(`:nth-child(${index}) > #variable-0-container-info > .card > .py-2 > :nth-child(1) > .grow > [slot="property"] > #description-container > .label > #description`);
    const setDataType = await page.locator(`:nth-child(${index}) > #variable-0-container-info #dataType`);
    const setDisplayPattern =  await page.locator(`:nth-child(${index}) > #variable-0-container-info > .card .svelte-select > .value-container > #displayPattern`);
   
    await  page.waitForSelector(':nth-child(1) > #variable-0-container-info #dataType');
    setDesc.fill('this is test description');
    await page.waitForTimeout(500)

   

    setDataType.fill(datatype);
    await page.waitForTimeout(500);
    setDataType.press('ArrowDown');
    await page.waitForTimeout(500);
    setDataType.press('Enter');

    await page.waitForTimeout(500)
    setDisplayPattern.fill(displaypattern);
    await page.waitForTimeout(500)
    setDisplayPattern.press('Enter');

}

async function markPrimaryandSave(page){

    const firstToggleInput = page.locator('.slide-toggle .slide-toggle-label > .slide-toggle-track').nth(0);
    await firstToggleInput.click(); // Click the first matching element
    await page.locator('#save').click()
    
}


async function validatePrimaryandSucessSymbols(page){

    await  page.waitForSelector('.text-error-500');
    const primarykey = page.locator('.text-error-500');
    await expect(primarykey).toBeVisible();
    const succes = page.locator('.gap-1 > .text-success-500');
    await  page.waitForSelector('.gap-1 > .text-success-500');
    await expect(succes).toBeVisible();
}

async function submitData(page){

    await page.locator('.h-full > :nth-child(1) > .flex > .btn').click()
    const submitmodal = page.locator('[data-testid="modal"]');
    const importstartmodal = page.locator('[data-testid="modal"]');
    await expect(submitmodal).toBeVisible();
    await page.locator('.modal-footer > .variant-filled').click()
    await expect(importstartmodal).toBeVisible();
    await page.locator('.modal-footer > .btn').click()

    const alertmsg = page.locator('.alert-message > p');
    await  page.waitForSelector('.alert-message > p');
    await expect(alertmsg).toHaveText('All upload information has been entered and the upload will start now. After completion an email will be sent.');
}
module.exports = {
    createNewtabularData,
    uploadfiles,
    markingVariableData,
    EnterTitleandDesc,
    AssignDataTypeDisplayPattern,
    markPrimaryandSave,
    validatePrimaryandSucessSymbols,
    submitData

};