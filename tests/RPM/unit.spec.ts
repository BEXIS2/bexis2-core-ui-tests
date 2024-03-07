import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';
const { checkTitle } = require('./utils/uniqueFunction');

const { checkUnits, createUnit, findNewUnit, deleteUnit, checkAndCloseToast, editUnitDescription, findEditedUnit } = require('./utils/unitFunctions');


// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Unit', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await page.goto(`${host}/rpm/unit/`); // Go to UnitManager page
  });

  test.afterAll(async () => {
    await page.close(); // Close the page after all tests
  });

  // Unique name for the unit
  test.describe('Iterations for fields validation', () => {
    const unitIterate = `test_iterate-${+Date.now()}`;
    test('Check title ', async () => {
      //Check with title name
      await checkTitle(page, 'Units', '.w-full >> .table.table-compact', 'h1.h1');
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
    const unit = `test_new-${+Date.now()}`;
    test('should match the expected title', async () => {
      await checkTitle(page, 'Units', '.w-full >> .table.table-compact', 'h1.h1');
    });

    test('Create Unit', async () => {
      await createUnit(page, unit);
    });

    test('Find the new unit in the table', async () => {
      await findNewUnit(page, unit);
    });

    test('Delete new unit', async () => {
      await deleteUnit(page, unit);
    });

    test('Check toast', async () => {
      await checkAndCloseToast(page, unit);
    });

  });
  test.describe('Edit new unit', () => {
    const unit = `test_edit-${+Date.now()}`;
    test('should match the expected title', async () => {
      await checkTitle(page, 'Units', '.w-full >> .table.table-compact', 'h1.h1');
    });

    test('Create unit', async () => {
      await createUnit(page, unit);
    });

    test('Find the new unit in the table', async () => {
      await findNewUnit(page, unit);
    });

    // Check the title
    test('Title', async () => {
      await page.locator('[id^=edit-]').click(); // Click on the edit button

      const title = await page
        .locator('.w-full', { has: page.locator('.table.table-compact') })
        .locator('div.h3');
      await expect(title).toHaveText(unit);
    });
    test('Edit description unit', async () => {
      test.slow();
      await editUnitDescription(page, unit);
    });

    test('Find the edited unit in the table', async () => {
      await findEditedUnit(page, unit);
    });

    test('Delete new unit', async () => {
      await deleteUnit(page, unit);
    });

    test('Check toast', async () => {
      await checkAndCloseToast(page, unit);
    });
  });


});
