import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const { checkTitle, checkAndCloseToast, deleteConstraint } = require('./utils/uniqueFunction');
const { findPatternConstraint, checkPatternConstraint, createPatternConstraint, findEditedPatternConstraint, editPatternDescription } = require('./utils/patternFunctions');
import { gotoApp, login } from '../shared';

test.describe('Pattern Constraint', () => {
    let page: Page;
    const newConstraint = `test_new-${Date.now()}`;
    const editedConstraint = `test_edit-${Date.now()}`;
    const validationConstraint = `test_iterate-${Date.now()}`;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(60_000);
        page = await browser.newPage();
        await login(page);
    });

    test.beforeEach(async () => {
        await gotoApp(page, '/rpm/constraints/', '#create');
    });

    test.afterAll(async ({ browser }) => {
        test.setTimeout(120_000);
        const cleanupErrors: string[] = [];
        const cleanupPage = await browser.newPage();

        try {
            await login(cleanupPage);
            for (const constraint of [validationConstraint, newConstraint, editedConstraint]) {
                try {
                    await gotoApp(cleanupPage, '/rpm/constraints/', '#create');
                    if (await deleteConstraint(cleanupPage, constraint, true, false)) {
                        await checkAndCloseToast(cleanupPage, constraint);
                    }
                } catch (error) {
                    cleanupErrors.push(`${constraint}: ${error}`);
                }
            }
        } catch (error) {
            cleanupErrors.push(`setup: ${error}`);
        } finally {
            await cleanupPage.close();
            if (page && !page.isClosed()) await page.close();
        }

        if (cleanupErrors.length > 0) {
            throw new Error(`Pattern-constraint cleanup failed:\n${cleanupErrors.join('\n')}`);
        }
    });

    // test.afterEach(async ({ page }) => {
    //     if (deleteConstraint === false) {
    //         // Delete the constraint
    //         await deleteConstraint(expect, page, constraint);
    //         await checkAndCloseToast(expect, page, constraint);
    //     }

   // });
   test.slow()
    test.describe('Iterations for fields validation', () => {
        test('Check title ', async () => {
            //Check with title name
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });
        test('Check with Empty field and Pattern type', async () => {
            await checkPatternConstraint(page, "", "", "Pattern", "")
        });

        test('Check with only constraint name and Pattern type ', async () => {
            await checkPatternConstraint(page, validationConstraint, "", "Pattern", "")
        });
        test('Check with only description and Pattern type ', async () => {
            await checkPatternConstraint(page, "", "Test Contraint", "Pattern", "")
        });

        // test('Check with console input and constraint Pattern type ', async () => {
        //     await checkPatternConstraint(page, "", "", "Pattern", "Hello Pattern")
        // }); Not VALID anymore because on the UI the save button is disabled so there
        // is no need to ask for validation on toast msgs 

        test('Check with name description and constraint Pattern type ', async () => {
            await checkPatternConstraint(page, validationConstraint, "Test Contraint", "Pattern", "")
        });

    });
    test.slow()
    test.describe('Create Pattern Constraints', () => {
        test('creates, finds and deletes a pattern constraint', async () => {
            test.slow();
            await test.step('Check title', async () => {
                await checkTitle(page, 'Constraints');
            });
            await test.step('Create and find constraint', async () => {
                await createPatternConstraint(page, newConstraint);
                await findPatternConstraint(page, newConstraint);
            });
            await test.step('Delete constraint', async () => {
                await deleteConstraint(page, newConstraint, false, false);
                await checkAndCloseToast(page, newConstraint);
            });
        });

    });
    test.slow();
    test.describe('Edit new constraint', () => {
        test('creates, edits, finds and deletes a pattern constraint', async () => {
            test.slow();
            await test.step('Check title', async () => {
                await checkTitle(page, 'Constraints');
            });
            await test.step('Create and find constraint', async () => {
                await createPatternConstraint(page, editedConstraint);
                await findPatternConstraint(page, editedConstraint);
            });
            await test.step('Open and verify edit form', async () => {
                await page.locator('[id^=edit-]').click();
                const title = page
                    .locator('.w-full', { has: page.locator('.table.table-compact') })
                    .locator('div.h3');
                await expect(title).toHaveText(editedConstraint);
            });
            await test.step('Edit and verify constraint', async () => {
                await editPatternDescription(page, editedConstraint);
                await findEditedPatternConstraint(page, editedConstraint);
            });
            await test.step('Delete constraint', async () => {
                await deleteConstraint(page, editedConstraint, false, false);
                await checkAndCloseToast(page, editedConstraint);
            });
        });
    });
});
