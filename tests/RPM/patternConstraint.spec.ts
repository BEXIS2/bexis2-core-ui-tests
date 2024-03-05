import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const { checkTitle, checkAndCloseToast, deleteConstraint } = require('./utils/uniqueFunction');
const { findPatternConstraint, checkPatternConstraint, createPatternConstraint, findEditedPatternConstraint, editPatternDescription } = require('./utils/patternFunctions');
import { login, host } from '../shared';

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Pattern Constraint', () => {
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
    test.describe('Iterations for fields validation', () => {
        const constraint = `test_iterate-${+Date.now()}`;
        test('Check title ', async () => {
            //Check with title name
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });
        test('Check with Empty field and Pattern type', async () => {
            await checkPatternConstraint(page, "", "", "Pattern", "")
        });

        test('Check with only constraint name and Pattern type ', async () => {
            await checkPatternConstraint(page, constraint, "", "Pattern", "")
        });
        test('Check with only description and Pattern type ', async () => {
            await checkPatternConstraint(page, "", "Test Contraint", "Pattern", "")
        });

        test('Check with console input and constraint Pattern type ', async () => {
            await checkPatternConstraint(page, "", "", "Pattern", "Hello Testing Pattern")
        });

        test('Check with name description and constraint Pattern type ', async () => {
            await checkPatternConstraint(page, constraint, "Test Contraint", "Pattern", "")
        });

    });

    test.describe('Create Pattern Constraints', () => {
        const constraint = `test_new-${+Date.now()}`;

        test('should match the expected title', async () => {
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });

        test('Create Pattern Constraint', async () => {
            await createPatternConstraint(page, constraint);
        });
        test('Find the new constraint in the table', async () => {
            await findPatternConstraint(page, constraint);
        });

        test('Delete new constraint', async () => {
            await deleteConstraint(page, constraint);
        });

        test('Check toast', async () => {
            await checkAndCloseToast(page, constraint);
        });

    });

    test.describe('Edit new constraint', () => {
        const constraint = `test_edit-${+Date.now()}`;

        test('should match the expected title', async () => {
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });

        test('Create Pattern Constraint', async () => {
            await createPatternConstraint(page, constraint);
        });

        test('Find the new constraint in the table', async () => {
            await findPatternConstraint(page, constraint);
        });

        // Check the title
        test('Title', async () => {
            await page.locator('[id^=edit-]').click(); // Click on the edit button

            const title = await page
                .locator('.w-full', { has: page.locator('.table.table-compact') })
                .locator('div.h3');
            await expect(title).toHaveText(constraint);
        });
        test('Edit description pattern', async () => {
            await editPatternDescription(page, constraint);
        });

        test('Find the edited constraint in the table', async () => {
            await findEditedPatternConstraint(page, constraint);
        });
        test('Delete new constraint', async () => {
            await deleteConstraint(page, constraint);
        });

        test('Check toast', async () => {
            await checkAndCloseToast(page, constraint);
        });
    });
});
