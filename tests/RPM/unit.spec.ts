import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { gotoApp, login } from '../shared';
const { checkTitle } = require('./utils/uniqueFunction');

const { checkUnits, createUnit, findNewUnit, deleteUnit, checkAndCloseToast, editUnitDescription, findEditedUnit } = require('./utils/unitFunctions');


test.describe('Unit', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;
  const unitNew = `test_new-${+Date.now()}`;
  const unitEdit = `test_edit-${+Date.now()}`;

  async function deleteUnitIfPresent(cleanupPage: Page, unit: string) {
    await gotoApp(cleanupPage, '/rpm/unit/', '#create');
    await cleanupPage.locator('#Units-search').fill(unit);
    await cleanupPage.locator('form.flex > button:nth-child(2)').click();

    const row = cleanupPage.locator('[id^=Units-row-]').filter({
      has: cleanupPage.getByText(unit, { exact: true }),
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
    await deleteUnit(cleanupPage, unit);
    await checkAndCloseToast(cleanupPage, unit);
  }

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await gotoApp(page, '/rpm/unit/', '#create');
  });

  test.beforeEach(async () => {
    await gotoApp(page, '/rpm/unit/', '#create');
  });

  test.afterAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(120_000);
    const cleanupErrors: string[] = [];
    let cleanupPage: Page | undefined;

    try {
      cleanupPage = await browser.newPage();
      await login(cleanupPage);

      for (const unit of [unitNew, unitEdit]) {
        try {
          await deleteUnitIfPresent(cleanupPage, unit);
        } catch (error) {
          cleanupErrors.push(`${unit}: ${error}`);
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

 // Unique name for the unit
  test.describe('Iterations for fields validation', () => {
    const unitIterate = `test_iterate-${+Date.now()}`;
    test('Check title ', async () => {
      //Check with title name
      await checkTitle(page, 'Units');
    });


    test('Check with name field , Abbreviation description', async () => {
      await checkUnits(page, unitIterate, "TU", "Test Unit", "", "", "")
    });
    test('Check with name field , Abbreviation, description and string data type', async () => {
      await checkUnits(page, unitIterate, "TU", "Test Unit", "String", "", "")
    });
    test('Check with name field , Abbreviation, description and none dimesnion', async () => {
      await checkUnits(page, unitIterate, "TU", "Test Unit", "", "none", "")
    });
    test('Check with name field and Abbreviation,', async () => {
      await checkUnits(page, unitIterate, "TU", "", "", "", "")
    });

    test('Check with name field and description', async () => {
      await checkUnits(page, unitIterate, "", "Test Unit", "", "", "")
    });
    test('Check with name field , Abbreviation, description and Unknown measurement', async () => {
      await checkUnits(page, unitIterate, "TU", "Test Unit", "", "", "Unknown")
    });
    test('Check with name field , Abbreviation, description, dimension and Unknown measurement', async () => {
      await checkUnits(page, unitIterate, "TU", "Test Unit", "", "none", "Unknown")
    });
    test('Check with name field , Abbreviation, description, dimension and string data type', async () => {
      await checkUnits(page, unitIterate, "TU", "Test Unit", "String", "", "Unknown")
    });

  });
  
  test.describe('Create new unit', () => {
    test('Create, find and delete unit', async () => {
      test.slow();

      await test.step('Check title', async () => {
        await checkTitle(page, 'Units');
      });
      await test.step('Create unit', async () => {
        await createUnit(page, unitNew);
      });
      await test.step('Find the new unit in the table', async () => {
        await findNewUnit(page, unitNew);
      });
      await test.step('Delete new unit', async () => {
        await deleteUnit(page, unitNew);
      });
      await test.step('Check toast', async () => {
        await checkAndCloseToast(page, unitNew);
      });
    });
  });
  test.describe('Edit new unit', () => {
    test('Create, edit, find and delete unit', async () => {
      test.slow();

      await test.step('Check title', async () => {
        await checkTitle(page, 'Units');
      });
      await test.step('Create unit', async () => {
        await createUnit(page, unitEdit);
      });
      await test.step('Find the new unit in the table', async () => {
        await findNewUnit(page, unitEdit);
      });
      await test.step('Open unit editor and check title', async () => {
        await page.locator('[id^=edit-]').click();
        const title = page.locator('div.h3').filter({ hasText: unitEdit });
        await expect(title).toBeVisible();
        await expect(title).toHaveText(unitEdit);
      });
      await test.step('Edit description unit', async () => {
        await editUnitDescription(page, unitEdit);
      });
      await test.step('Find the edited unit in the table', async () => {
        await findEditedUnit(page, unitEdit);
      });
      await test.step('Delete edited unit', async () => {
        await deleteUnit(page, unitEdit);
      });
      await test.step('Check toast', async () => {
        await checkAndCloseToast(page, unitEdit);
      });
    });
  });
});
