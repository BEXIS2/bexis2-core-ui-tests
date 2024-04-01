import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';
const { checkTitle } = require('./utils/uniqueFunction');
const { checkDimension, createDimension, findNewDimension, deleteDimension, checkAndCloseToast, editDimensionDes, findEditedDimension } = require('./utils/dimensionFunctions');

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Dimensions', () => {
    // Declare page outside of the test hooks so it's accessible by all tests.
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage(); // Create new page
        await login(page); // Login
        await page.goto(`${host}/rpm/dimension/`); // Go to Dimensions Manager page
    });

    test.afterAll(async () => {
        await page.close(); // Close the page after all tests
    });

    test.describe('Iterations for fields validation', () => {
        const dimension = `test_iterate-${+Date.now()}`;
        test('Check with name field ', async () => {
            await checkDimension(page, dimension, "", "");
        });

        test('Check with name field , Specification ', async () => {
            await checkDimension(page, dimension, "Testing", "");
        });
        test('Check with name field and description ', async () => {
            await checkDimension(page, dimension, "", "Testing");
        });
        test('Check with Specification field and description ', async () => {
            await checkDimension(page, "", "Testing", "Testing");
        });
    });


    test.describe('Create new dimension', () => {
        const dimension = `test_new-${+Date.now()}`;
        test('should match the expected title', async () => {
            await checkTitle(page, 'Dimensions', '.w-full >> .table.table-compact', 'h1.h1');
        });

        test('Create dimension', async () => {
            await createDimension(page, dimension);
        });
        test.slow();
        test('Find the new dimension in the table', async () => {
            await findNewDimension(page, dimension);
        });

        test('Delete new dimension', async () => {
            await deleteDimension(page, dimension);
        });
        test('Check toast', async () => {
            await checkAndCloseToast(page, dimension);
        });


    });
    test.describe('Edit new dimension', () => {
        const dimension = `test_edit-${+Date.now()}`;
        test('should match the expected title', async () => {
            await checkTitle(page, 'Dimensions', '.w-full >> .table.table-compact', 'h1.h1');
        });

        test('Create dimension', async () => {
            await createDimension(page, dimension);
        });

        test('Find the new dimension in the table', async () => {
            await findNewDimension(page, dimension);
        });

        // Check the title
        test('Title', async () => {
            await page.locator('[id^=edit-]').click(); // Click on the edit button

            const title = await page
                .locator('.w-full', { has: page.locator('.table.table-compact') })
                .locator('div.h3');
            await expect(title).toHaveText(dimension);
        });
        test('Edit description dimension', async () => {
            test.slow();
            await editDimensionDes(page, dimension);
        });

        test('Find the edited dimension in the table', async () => {
            await findEditedDimension(page, dimension);
        });

        test('Delete new dimension', async () => {
            await deleteDimension(page, dimension);
        });

        test('Check toast', async () => {
            await checkAndCloseToast(page, dimension);
        });
    });

});
