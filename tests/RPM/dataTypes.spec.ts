import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const { checkTitle } = require('./utils/uniqueFunction');

const { checkDataTypes, createDataType, findDataType, deleteDataType, checkAndCloseToast, editDataTypeDescription, findEditedDataType } = require('./utils/dataTypeFunctions');


import { gotoApp, login } from '../shared';

test.describe('Data Types', () => {
    // Declare page outside of the test hooks so it's accessible by all tests.
    let page: Page;
    const dataTypeNew = `test_new-${+Date.now()}`;
    const dataTypeEdit = `test_edit-${+Date.now()}`;

    async function deleteDataTypeIfPresent(cleanupPage: Page, dataType: string) {
        await gotoApp(cleanupPage, '/rpm/datatype/', '#create');
        await cleanupPage.locator('#dataTypes-search').fill(dataType);
        await cleanupPage.locator('#dataTypes-searchSubmit').click();

        const row = cleanupPage.locator('[id^=dataTypes-row-]').filter({
            has: cleanupPage.getByText(dataType, { exact: true }),
        });
        const emptyTable = cleanupPage.getByText('No rows available', { exact: true });

        await expect.poll(async () => {
            const matches = await row.count();
            const isEmpty = await emptyTable.isVisible();
            return matches === 1 || (matches === 0 && isEmpty);
        }, { timeout: 10_000 }).toBe(true);

        if (await row.count() === 0) {
            return;
        }

        await expect(row).toHaveCount(1);
        await deleteDataType(cleanupPage, dataType);
        await checkAndCloseToast(cleanupPage, dataType);
    }

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage(); // Create new page
        await login(page); // Login
        await gotoApp(page, '/rpm/datatype/', '#create');
    });

    test.beforeEach(async () => {
        await gotoApp(page, '/rpm/datatype/', '#create');
    });

    test.afterAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(120_000);
        const cleanupErrors: string[] = [];
        let cleanupPage: Page | undefined;

        try {
            cleanupPage = await browser.newPage();
            await login(cleanupPage);

            for (const dataType of [dataTypeNew, dataTypeEdit]) {
                try {
                    await deleteDataTypeIfPresent(cleanupPage, dataType);
                } catch (error) {
                    cleanupErrors.push(`${dataType}: ${error}`);
                }
            }
        } catch (error) {
            cleanupErrors.push(`cleanup setup: ${error}`);
        } finally {
            if (cleanupPage && !cleanupPage.isClosed()) {
                await cleanupPage.close();
            }
            if (page && !page.isClosed()) {
                await page.close();
            }
        }

        expect(cleanupErrors, cleanupErrors.join('\n')).toEqual([]);
    });
    test.slow();
    test('Title', async () => {
        await checkTitle(page, 'Data Types');
    });

    // Unique name for the data type
    test.describe('Iterations for fields validation', () => {
        const dataTypeIterate = `test_iterate-${+Date.now()}`;
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
    test.slow();
    test.describe('Create new data type', () => {
        test('Create, find and delete data type', async () => {
            test.slow();

            await test.step('Check title', async () => {
                await checkTitle(page, 'Data Types');
            });
            await test.step('Create data type', async () => {
                await createDataType(page, dataTypeNew, "Empty");
            });
            await test.step('Find the new data type in the table', async () => {
                await findDataType(page, dataTypeNew);
            });
            await test.step('Delete new data type', async () => {
                await deleteDataType(page, dataTypeNew);
            });
            await test.step('Check toast', async () => {
                await checkAndCloseToast(page, dataTypeNew);
            });
        });
    });
    test.describe('Edit new data type', () => {
        test('Create, edit, find and delete data type', async () => {
            test.slow();

            await test.step('Check title', async () => {
                await checkTitle(page, 'Data Types');
            });
            await test.step('Create data type', async () => {
                await createDataType(page, dataTypeEdit, "Empty");
            });
            await test.step('Find the new data type in the table', async () => {
                await findDataType(page, dataTypeEdit);
            });
            await test.step('Open data type editor and check title', async () => {
                await page.locator('[id^=edit-]').click();
                const title = page.locator('div.h3').filter({ hasText: dataTypeEdit });
                await expect(title).toBeVisible();
                await expect(title).toHaveText(dataTypeEdit);
            });
            await test.step('Edit description data type', async () => {
                await editDataTypeDescription(page, dataTypeEdit);
            });
            await test.step('Find the edited data type in the table', async () => {
                await findEditedDataType(page, dataTypeEdit);
            });
            await test.step('Delete edited data type', async () => {
                await deleteDataType(page, dataTypeEdit);
            });
            await test.step('Check toast', async () => {
                await checkAndCloseToast(page, dataTypeEdit);
            });
        });
    });
});
