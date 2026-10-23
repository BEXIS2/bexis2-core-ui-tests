import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const { checkTitle, checkAndCloseToast, deleteConstraint } = require('./utils/uniqueFunction');
const { checkDomainConstraint, createDomainConstraint, findDomainConstraint, findEditedDomainConstraint, editDomainDescription } = require('./utils/domainFunctions');

import { gotoApp, login } from '../shared';

test.describe('Create Domain Constraint', () => {
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
            throw new Error(`Domain-constraint cleanup failed:\n${cleanupErrors.join('\n')}`);
        }
    });

    // test.afterEach(async ({ page }) => {
    //    if (deleteConstraint === false) {
    // Delete the constraint
    //        await deleteConstraint(page, constraint);
    //        await checkAndCloseToast( page, constraint);
    //    }
    //});

    test.describe('Iterations for fields validation', () => {
        test('Check title ', async () => {
            //Check with title name
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });
        test('Check with Empty field and Domain type', async () => {
            await checkDomainConstraint(page, "", "", "Domain", "")
        });

        test('Check with only constraint name and domain type ', async () => {
            await checkDomainConstraint(page, validationConstraint, "", "Domain", "")
        });
        test('Check with only description and domain type ', async () => {
            await checkDomainConstraint(page, "", "Test Contraint", "Domain", "")
        });

        test('Check with console input and constraint domain type ', async () => {
            await checkDomainConstraint(page, "", "", "Domain", "Hello Testing Domain")
        });

        test('Check with name description and constraint domain type ', async () => {
            await checkDomainConstraint(page, validationConstraint, "Test Contraint", "Domain", "")
        });

    });

    test.describe('Create new Constraints', () => {
        test('creates, finds and deletes a domain constraint', async () => {
            await test.step('Check title', async () => {
                await checkTitle(page, 'Constraints');
            });
            await test.step('Create constraint', async () => {
                await createDomainConstraint(page, newConstraint);
            });
            await test.step('Find constraint', async () => {
                await findDomainConstraint(page, newConstraint);
            });
            await test.step('Verify complete delete confirmation and delete constraint', async () => {
                await deleteConstraint(page, newConstraint, false, true);
                await checkAndCloseToast(page, newConstraint);
            });
        });

    });

    test.describe('Edit new Domain constraint', () => {
        test('creates, edits, finds and deletes a domain constraint', async () => {
            test.slow();
            await test.step('Check title', async () => {
                await checkTitle(page, 'Constraints');
            });
            await test.step('Create and find constraint', async () => {
                await createDomainConstraint(page, editedConstraint);
                await findDomainConstraint(page, editedConstraint);
            });
            await test.step('Open and verify edit form', async () => {
                await page.locator('[id^=edit-]').click();
                const title = page
                    .locator('.w-full', { has: page.locator('.table.table-compact') })
                    .locator('div.h3');
                await expect(title).toHaveText(editedConstraint);
            });
            await test.step('Edit and verify constraint', async () => {
                await editDomainDescription(page, editedConstraint);
                await findEditedDomainConstraint(page, editedConstraint);
            });
            await test.step('Delete constraint', async () => {
                await deleteConstraint(page, editedConstraint, false, false);
                await checkAndCloseToast(page, editedConstraint);
            });
        });

    });
});
