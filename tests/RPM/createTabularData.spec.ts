import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const { checkTitle } = require('./utils/uniqueFunction');

const { createNewtabularData,uploadfiles, markingVariableData,EnterTitleandDesc,AssignDataTypeDisplayPattern,markPrimaryandSave,validatePrimaryandSucessSymbols,submitData} = require('./utils/tabularDataFunctions');

import { login, host } from '../shared';

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Data Types', () => {
    // Declare page outside of the test hooks so it's accessible by all tests.
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      // test.setTimeout(120_000)
        page = await browser.newPage(); // Create new page
        await login(page); // Login
        await page.goto(`${host}/dcm/create/`); // Go to create dataset page
    });

    test.afterAll(async () => {
        await page.close(); // Close the page after all tests
    });
    test.slow();
    test('Title', async () => {
        // Check the title of the breadcrumb
        const title = page.locator('.breadcrumb > :nth-child(3)');
        await  page.waitForSelector('.breadcrumb > :nth-child(3)');
        await expect(title).toBeVisible();
    });

    
    test.describe('Creating a data set with tabular data', () => {

        const tabularTitle = `test-${Math.floor(performance.now())}`;

        test('Check with title and title description field ', async () => {
            await createNewtabularData(page, tabularTitle, 'testDesc');
          });

          test.slow();

        test('upload the file and select the data structure', async () => {
            await uploadfiles(page);
          });
          test.slow();

        test('marking the variable and data', async () => {
            await  markingVariableData(page);
          });
          

        test('Entering the title and Description for the data strucrture', async () => {
            await  EnterTitleandDesc(page,'Alpha'+tabularTitle,'TestDesc');
          });
          

        test('Assigning the data type (date) and display pattern (dd.MM.yy)', async () => {
            await  AssignDataTypeDisplayPattern(page,1,'date','dd.MM.yy');
          });
          

        test('Assigning the data type (date) and display pattern (dd.MM.yyyy)', async () => {
            await  AssignDataTypeDisplayPattern(page,2,'date','dd.MM.yyyy');
          });
          

        test('Assigning the data type (date) and display pattern (dd/MM/yy)', async () => {
            await  AssignDataTypeDisplayPattern(page,3,'date','dd/MM/yy');
          });
          

        test('Assigning the data type (date) and display pattern (dd/MM/yyyy)', async () => {
            await  AssignDataTypeDisplayPattern(page,4,'date','dd/MM/yyyy');
          });
         

        test('Assigning the data type (date) and display pattern (M/d/yyyy)', async () => {
            await  AssignDataTypeDisplayPattern(page,5,'date','M/d/yyyy');
          });
          
        
        test('Assigning the data type (datetime) and display pattern (M/d/yyyy h:m)', async () => {
            await  AssignDataTypeDisplayPattern(page,6,'datetime','M/d/yyyy h:m');
          });
          

        test('Assigning the data type (date) and display pattern (MM/dd/yy)', async () => {
            await  AssignDataTypeDisplayPattern(page,7,'date','MM/dd/yy');
          });
          

        test('Assigning the data type (date) and display pattern (MM/dd/yyyy)', async () => {
            await  AssignDataTypeDisplayPattern(page,8,'date','MM/dd/yyyy');
          });
         

        test('Assigning the data type (date) and display pattern (yy-MM-dd)', async () => {
            await  AssignDataTypeDisplayPattern(page,9,'date','yy-MM-dd');
          });
          

        test('Assigning the data type (date) and display pattern (yyyy-dd-MM)', async () => {
            await  AssignDataTypeDisplayPattern(page,10,'date','yyyy-dd-MM');
          });
          

        test('Assigning the data type (date) and display pattern (yyyy-d-M)', async () => {
            await  AssignDataTypeDisplayPattern(page,11,'date','yyyy-d-M');
          });
          

        test('Assigning the data type (date) and display pattern (yyyy-M-d)', async () => {
            await  AssignDataTypeDisplayPattern(page,12,'date','yyyy-M-d');
          });
         

        test('Assigning the data type (date) and display pattern (yyyy-MM-dd)', async () => {
            await  AssignDataTypeDisplayPattern(page,13,'date','yyyy-MM-dd');
          });
         

        test('Assigning the data type (time) and display pattern (HH:mm)', async () => {
            await  AssignDataTypeDisplayPattern(page,14,'time','HH:mm');
          });
          

        test('Assigning the data type (time) and display pattern (hh:mm tt)', async () => {
            await  AssignDataTypeDisplayPattern(page,15,'time','hh:mm tt');
          });
          

        test('Assigning the data type (time) and display pattern (hh:mm:ss)', async () => {
            await  AssignDataTypeDisplayPattern(page,16,'time','hh:mm:ss');
          });
         
        test('Assigning the data type (time) and display pattern (hh:mm:ss tt)', async () => {
            await  AssignDataTypeDisplayPattern(page,17,'time','hh:mm:ss tt');
          });

        test('Assigning the data type (date) and display pattern (MM)', async () => {
            await  AssignDataTypeDisplayPattern(page,18,'date','MM');
            const setDisplayPattern =  page.locator(`:nth-child(18) > #variable-0-container-info > .card .svelte-select > .value-container > #displayPattern`);
            setDisplayPattern.press('ArrowDown');
            await page.waitForTimeout(500);
            setDisplayPattern.press('Enter');
          });
          

        test('Assigning the data type (date) and display pattern (yyyy)', async () => {
            await  AssignDataTypeDisplayPattern(page,19,'date','yyyy');
            const setDisplayPattern =  page.locator(`:nth-child(19) > #variable-0-container-info > .card .svelte-select > .value-container > #displayPattern`);
            setDisplayPattern.press('ArrowDown');
            await page.waitForTimeout(500);
            setDisplayPattern.press('Enter');

          });

        test('Marking the 1st as part of primary key and saving it', async () => {
            await  markPrimaryandSave(page)
          });

        test('validate the primary key and success symbols are visible', async () => {
            await  validatePrimaryandSucessSymbols(page)
          });

        test('Submit the data valdate the validation messages', async () => {
            await  submitData(page)
          });

    });
    
});
