import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { gotoApp, login } from '../shared';
const { checkTitle } = require('./utils/uniqueFunction');
const { checkDimension, createDimension, findNewDimension, deleteDimension, checkAndCloseToast, editDimensionDes, findEditedDimension } = require('./utils/dimensionFunctions');

test.describe('Dimensions', () => {
    // Declare page outside of the test hooks so it's accessible by all tests.
    let page: Page;
    const dimensionNew = `test_new-${+Date.now()}`;
    const dimensionEdit = `test_edit-${+Date.now()}`;

    async function deleteDimensionIfPresent(cleanupPage: Page, dimension: string) {
        await gotoApp(cleanupPage, '/rpm/dimension/', '#create');
        await cleanupPage.locator('#dimensions-search').fill(dimension);
        await cleanupPage.locator('#dimensions-searchSubmit').click();

        const row = cleanupPage.locator('[id^=dimensions-row-]').filter({
            has: cleanupPage.getByText(dimension, { exact: true }),
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
        await deleteDimension(cleanupPage, dimension);
        await checkAndCloseToast(cleanupPage, dimension);
    }

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage(); // Create new page
        await login(page); // Login
        await gotoApp(page, '/rpm/dimension/', '#create');
    });

    test.beforeEach(async () => {
        await gotoApp(page, '/rpm/dimension/', '#create');
    });

    test.afterAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(120_000);
        const cleanupErrors: string[] = [];
        let cleanupPage: Page | undefined;

        try {
            cleanupPage = await browser.newPage();
            await login(cleanupPage);

            for (const dimension of [dimensionNew, dimensionEdit]) {
                try {
                    await deleteDimensionIfPresent(cleanupPage, dimension);
                } catch (error) {
                    cleanupErrors.push(`${dimension}: ${error}`);
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
        test('Create, find and delete dimension', async () => {
            test.slow();

            await test.step('Check title', async () => {
                await checkTitle(page, 'Dimensions');
            });
            await test.step('Create dimension', async () => {
                await createDimension(page, dimensionNew);
            });
            await test.step('Find the new dimension in the table', async () => {
                await findNewDimension(page, dimensionNew);
            });
            await test.step('Delete new dimension', async () => {
                await deleteDimension(page, dimensionNew);
            });
            await test.step('Check toast', async () => {
                await checkAndCloseToast(page, dimensionNew);
            });
        });
    });
    test.describe('Edit new dimension', () => {
        test('Create, edit, find and delete dimension', async () => {
            test.slow();

            await test.step('Check title', async () => {
                await checkTitle(page, 'Dimensions');
            });
            await test.step('Create dimension', async () => {
                await createDimension(page, dimensionEdit);
            });
            await test.step('Find the new dimension in the table', async () => {
                await findNewDimension(page, dimensionEdit);
            });
            await test.step('Open dimension editor and check title', async () => {
                await page.locator('[id^=edit-]').click();
                const title = page.locator('div.h3').filter({ hasText: dimensionEdit });
                await expect(title).toBeVisible();
                await expect(title).toHaveText(dimensionEdit);
            });
            await test.step('Edit description dimension', async () => {
                await editDimensionDes(page, dimensionEdit);
            });
            await test.step('Find the edited dimension in the table', async () => {
                await findEditedDimension(page, dimensionEdit);
            });
            await test.step('Delete edited dimension', async () => {
                await deleteDimension(page, dimensionEdit);
            });
            await test.step('Check toast', async () => {
                await checkAndCloseToast(page, dimensionEdit);
            });
        });
    });

});
