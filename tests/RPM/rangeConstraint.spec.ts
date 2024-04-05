import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const { checkTitle, checkAndCloseToast, deleteConstraint } = require('./utils/uniqueFunction');
const { findRangeConstraint, checkRangeConstraint, createRangeConstraint, findEditedRangeConstraint, editRangeDescription } = require('./utils/rangeFunctions');
import { login, host } from '../shared';

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Range Constraint', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await login(page);
        await page.goto(`${host}/rpm/constraints/`);
    });

    test.afterAll(async () => {
        await page.close();
    });
    // test.afterEach(async ({ page }) => {
    //     if (deleteConstraint === false) {
    //         // Delete the constraint
    //         await deleteConstraint(expect, page, constraint);
    //         await checkAndCloseToast(expect, page, constraint);
    //     }
    // });
   test.slow();
    test.describe('Iterations for fields validation', () => {
        const constraint = `test_iterate-${+Date.now()}`;
        test('Check title ', async () => {
            //Check with title name
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });
        test('Check with Empty field and Range type', async () => {
            await checkRangeConstraint(page, "", "", "Range", "", "")
        });

        test('Check with only constraint name and Range type ', async () => {
            await checkRangeConstraint(page, constraint, "", "Range", "", "")
        });
        test('Check with only description and Range type ', async () => {
            await checkRangeConstraint(page, "", "Test Contraint", "Range", "", "")
        });

        test('Check with console input and constraint Range type ', async () => {
            await checkRangeConstraint(page, "", "", "Range", "1", "5")
        });

        test('Check with name description and constraint Range type ', async () => {
            await checkRangeConstraint(page, constraint, "Test Contraint", "Range", "", "")
        });

    });
    test.slow();
    test.describe('Create Range Constraint', () => {
        const constraint = `test_new-${+Date.now()}`;

        test('should match the expected title', async () => {
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });
        test.slow();
        test('Create Range Constraint', async () => {
            await createRangeConstraint(page, constraint);
        });
        test('Find the new constraint in the table', async () => {
            await findRangeConstraint(page, constraint);
        });
     
        test('Delete new constraint', async () => {
            await deleteConstraint(page, constraint);
        });
        
        test('Check toast', async () => {
            await checkAndCloseToast(page, constraint);
        });

    });

    test.slow();
    test.describe('Edit new constraint', () => {
        const constraint = `test_edit-${+Date.now()}`;
        test('should match the expected title', async () => {
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });
        
        test('Create Range Constraint', async () => {
            await createRangeConstraint(page, constraint);
        });

        test('Find the new constraint in the table', async () => {
            await findRangeConstraint(page, constraint);
        });

        // Check the title
        test('Title', async () => {
            await page.locator('[id^=edit-]').click(); // Click on the edit button

            const title = await page
                .locator('.w-full', { has: page.locator('.table.table-compact') })
                .locator('div.h3');
            await expect(title).toHaveText(constraint);
        });
        test.slow();
        test('Edit description pattern', async () => {
            await editRangeDescription(page, constraint);
        });

        test('Find the edited constraint in the table', async () => {
            await findEditedRangeConstraint(page, constraint);
        });
      
        test('Delete new constraint', async () => {
            await deleteConstraint(page, constraint);
        });
        
        test('Check toast', async () => {
            await checkAndCloseToast(page, constraint);
        });
    });
});

