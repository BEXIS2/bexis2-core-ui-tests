import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const { checkTitle, checkAndCloseToast, deleteConstraint } = require('./utils/uniqueFunction');
const { findRangeConstraint, checkRangeConstraint, createRangeConstraint, findEditedRangeConstraint, editRangeDescription } = require('./utils/rangeFunctions');
import { gotoApp, login } from '../shared';

test.describe('Range Constraint', () => {
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
            throw new Error(`Range-constraint cleanup failed:\n${cleanupErrors.join('\n')}`);
        }
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
        test('Check title ', async () => {
            //Check with title name
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });
        test('Check with Empty field and Range type', async () => {
            await checkRangeConstraint(page, "", "", "Range", "", "")
        });

        test('Check with only constraint name and Range type ', async () => {
            await checkRangeConstraint(page, validationConstraint, "", "Range", "", "")
        });
        test('Check with only description and Range type ', async () => {
            await checkRangeConstraint(page, "", "Test Contraint", "Range", "", "")
        });

        test('Check with console input and constraint Range type ', async () => {
            await checkRangeConstraint(page, "", "", "Range", "1", "5")
        });

        test('Check with name description and constraint Range type ', async () => {
            await checkRangeConstraint(page, validationConstraint, "Test Contraint", "Range", "", "")
        });

    });
    test.slow();
    test.describe('Create Range Constraint', () => {
        test('creates, finds and deletes a range constraint', async () => {
            test.slow();
            await test.step('Check title', async () => {
                await checkTitle(page, 'Constraints');
            });
            await test.step('Create and find constraint', async () => {
                await createRangeConstraint(page, newConstraint);
                await findRangeConstraint(page, newConstraint);
            });
            await test.step('Delete constraint', async () => {
                await deleteConstraint(page, newConstraint, false, false);
                await checkAndCloseToast(page, newConstraint);
            });
        });

    });

    test.slow();
    test.describe('Edit new constraint', () => {
        test('creates, edits, finds and deletes a range constraint', async () => {
            test.slow();
            await test.step('Check title', async () => {
                await checkTitle(page, 'Constraints');
            });
            await test.step('Create and find constraint', async () => {
                await createRangeConstraint(page, editedConstraint);
                await findRangeConstraint(page, editedConstraint);
            });
            await test.step('Open and verify edit form', async () => {
                await page.locator('[id^=edit-]').click();
                const title = page
                    .locator('.w-full', { has: page.locator('.table.table-compact') })
                    .locator('div.h3');
                await expect(title).toHaveText(editedConstraint);
            });
            await test.step('Edit and verify constraint', async () => {
                await editRangeDescription(page, editedConstraint);
                await findEditedRangeConstraint(page, editedConstraint);
            });
            await test.step('Delete constraint', async () => {
                await deleteConstraint(page, editedConstraint, false, false);
                await checkAndCloseToast(page, editedConstraint);
            });
        });
    });
});
