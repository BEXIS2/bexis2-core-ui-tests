import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const { checkTitle, checkAndCloseToast, deleteConstraint } = require('./utils/uniqueFunction');
const { checkDomainConstraint, createDomainConstraint, findDomainConstraint, findEditedDomainConstraint, editDomainDescription } = require('./utils/domainFunctions');

import { login, host } from '../shared';

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Create Domain Constraint', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await login(page);
        await page.goto(`${host}/rpm/constraints/`);
    });

    test.afterAll(async () => {
        // await deleteConstraint(expect, page, constraint);
        await page.close();
    });

    // test.afterEach(async ({ page }) => {
    //    if (deleteConstraint === false) {
    // Delete the constraint
    //        await deleteConstraint(page, constraint);
    //        await checkAndCloseToast( page, constraint);
    //    }
    //});

    test.describe('Iterations for fields validation', () => {
        const constraint = `test_iterate-${+Date.now()}`;
        test('Check title ', async () => {
            //Check with title name
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });
        test('Check with Empty field and Domain type', async () => {
            await checkDomainConstraint(page, "", "", "Domain", "")
        });

        test('Check with only constraint name and domain type ', async () => {
            await checkDomainConstraint(page, constraint, "", "Domain", "")
        });
        test('Check with only description and domain type ', async () => {
            await checkDomainConstraint(page, "", "Test Contraint", "Domain", "")
        });

        test('Check with console input and constraint domain type ', async () => {
            await checkDomainConstraint(page, "", "", "Domain", "Hello Testing Domain")
        });

        test('Check with name description and constraint domain type ', async () => {
            await checkDomainConstraint(page, constraint, "Test Contraint", "Domain", "")
        });

    });

    test.describe('Create new Constraints', () => {
        const constraint = `test_new-${+Date.now()}`;
        test('should match the expected title', async () => {
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });

        test('Create Domain Constraint', async () => {
            await createDomainConstraint(page, constraint);
        });

        test('Find the new constraint in the table', async () => {
            await findDomainConstraint(page, constraint);
        });

        test('Delete new constraint', async () => {
            await deleteConstraint(page, constraint);
        });

        test('Check toast', async () => {
            await checkAndCloseToast(page, constraint);
        });

    });

    test.describe('Edit new Domain constraint', () => {
        const constraint = `test_edit-${+Date.now()}`;
        test('should match the expected title', async () => {
            await checkTitle(page, 'Constraints', '.w-full >> .table.table-compact', 'h1.h1');
        });

        test('Create Domain Constraint', async () => {
            await createDomainConstraint(page, constraint);
        });

        test('Find the new constraint in the table', async () => {
            await findDomainConstraint(page, constraint);

        });

        // Check the title
        test('Title', async () => {
            await page.locator('[id^=edit-]').click(); // Click on the edit button

            const title = await page
                .locator('.w-full', { has: page.locator('.table.table-compact') })
                .locator('div.h3');
            await expect(title).toHaveText(constraint);
        });
        test('Edit description domain', async () => {
            test.slow();
            await editDomainDescription(page, constraint);
        });

        test('Find the edited constraint in the table', async () => {
            await findEditedDomainConstraint(page, constraint);
        });

        test('Delete new constraint', async () => {
            await deleteConstraint(page, constraint);
        });

        test('Check toast', async () => {
            await checkAndCloseToast(page, constraint);
        });

    });
});