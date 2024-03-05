import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const { checkTitle } = require('./utils/uniqueFunction');

const { checkDataTypes, createDataType, findDataType, deleteDataType, checkAndCloseToast, editDataTypeDescription, findEditedDataType } = require('./utils/dataTypeFunctions');


import { login, host } from '../shared';

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Data Types', () => {
    // Declare page outside of the test hooks so it's accessible by all tests.
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage(); // Create new page
        await login(page); // Login
        await page.goto(`${host}/rpm/datatype/`); // Go to Data Types Manager page
    });

    test.afterAll(async () => {
        await page.close(); // Close the page after all tests
    });

    test('Title', async () => {
        // Check the title of the table
        const title = await page
            .locator('.w-full', { has: page.locator('.table.table-compact') })
            .locator('h1.h1');
        await expect(title).toHaveText('Data Types');
    });

    // Unique name for the data type
    test.describe('Iterations for fields validation', () => {
        const dataTypeIterate = `test_iterate-${+Date.now()}`;
        test('Check title ', async () => {
            //Check with title name
            await checkTitle(page, 'Data Types', '.w-full >> .table.table-compact', 'h1.h1');
        });
        const dataTypes = [
            "Empty",
            "Object",
            "DBNull",
            "Boolean",
            "Char",
            "SByte",
            "Byte",
            "Int16",
            "UInt16",
            "Int32",
            "UInt32",
            "Int64",
            "Single",
            "Double",
            "Decimal",
            "DateTime",
            "String"
        ];

        dataTypes.forEach(dataType => {
            test(`Check with name field and ${dataType} data type`, async () => {
                await checkDataTypes(page, dataTypeIterate, "", dataType);
            });
        });



        test('Check with name field and description', async () => {
            await checkDataTypes(page, dataTypeIterate, "Testing", "")
        });

    });
    test.describe('Create new data type', () => {
        const dataType = `test_new-${+Date.now()}`;
        test('should match the expected title', async () => {
            await checkTitle(page, 'Data Types', '.w-full >> .table.table-compact', 'h1.h1');
        });

        test('Create data type', async () => {
            await createDataType(page, dataType, "Empty");
        });

        test('Find the new data type in the table', async () => {
            await findDataType(page, dataType);
        });

        test('Delete new data type', async () => {
            await deleteDataType(page, dataType);
        });

        test('Check toast', async () => {
            await checkAndCloseToast(page, dataType);
        });

    });
    test.describe('Edit new data type', () => {
        const dataType = `test_edit-${+Date.now()}`;
        test('should match the expected title', async () => {
            await checkTitle(page, 'Data Types', '.w-full >> .table.table-compact', 'h1.h1');
        });

        test('Create data type', async () => {
            await createDataType(page, dataType, "Empty");
        });

        test('Find the new data type in the table', async () => {
            await findDataType(page, dataType);
        });

        // Check the title
        test('Title', async () => {
            await page.locator('[id^=edit-]').click(); // Click on the edit button

            const title = await page
                .locator('.w-full', { has: page.locator('.table.table-compact') })
                .locator('div.h3');
            await expect(title).toHaveText(dataType);
        });
        test('Edit description data type', async () => {
            test.slow();
            await editDataTypeDescription(page, dataType);
        });

        test('Find the edited data type in the table', async () => {
            await findEditedDataType(page, dataType);
        });

        test('Delete new data type', async () => {
            await deleteDataType(page, dataType);
        });

        test('Check toast', async () => {
            await checkAndCloseToast(page, dataType);
        });

    });
});
