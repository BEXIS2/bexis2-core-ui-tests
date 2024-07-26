import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const { checkTitle } = require('./utils/uniqueFunction');

const { navDataStructure, checkConstraint, createDataStructure, findDataStructure, deleteDataStructure, checkAndCloseToast, editDataStructure, findEditedDataStructure, checkDataStructure } = require('./utils/dataStructureFunctions');

import { login, host } from '../shared';

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Data Structure', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await page.goto(`${host}/rpm/datastructure`); // Go to Data Structure page
  });

  test.afterAll(async () => {
    await page.close(); // Close the page after all tests
  });

  test.describe('Iterations for fields validation', () => {
    const dataStructure = `test_iterate-${+Date.now()}`;

    test('Check with title and title description field ', async () => {
      await checkDataStructure(page, dataStructure, "Test data structure", "", "", "", "", "", "");
    });

    test('Check with title, title description and hasPrimaryKey field', async () => {
      await navDataStructure(page);
      await checkDataStructure(page, dataStructure, "Test data structure", "hasPrimaryKey", "", "", "", "", "");
    });

    test('Check with title, title description and hasOptionalValue field', async () => {
      await navDataStructure(page);
      await checkDataStructure(page, dataStructure, "Test data structure", "", "hasOptionalValue", "", "", "", "");
    });

    test('Check with title, title description, name, description and hasPrimaryKey field', async () => {
      await navDataStructure(page);
      await checkDataStructure(page, dataStructure, "Test data structure", "hasPrimaryKey", "", dataStructure, "Test data structure", "", "");
    });
    test('Check with title, title description, name, description and hasOptionalValue field', async () => {
      await navDataStructure(page);
      await checkDataStructure(page, dataStructure, "Test data structure", "", "hasOptionalValue", dataStructure, "Test data structure", "", "");
    });

    test('Check with title, title description, name, description, hasPrimaryKey, hasOptionalValue and hasDataType field', async () => {
      await navDataStructure(page);
      await checkDataStructure(page, dataStructure, "Test data structure", "hasPrimaryKey", "hasOptionalValue", dataStructure, "Test data structure", "hasDataType", "");
    });

    test('Check with title, title description, name, description, hasPrimaryKey, hasOptionalValue and hasUnit field', async () => {
      await navDataStructure(page);
      await checkDataStructure(page, dataStructure, "Test data structure", "hasPrimaryKey", "hasOptionalValue", dataStructure, "Test data structure", "", "hasUnit");
    });


  });

  test.describe('Create new data structure', () => {
    const dataStructure = `test_new-${+Date.now()}`;
    //   // test('should match the expected title', async () => {
    //   await checkTitle(page, 'Data structure', '.w-full >> .table.table-compact', 'h1.h1');
    // });
    test('Check Constraint', async () => {
      await navDataStructure(page);
      await checkConstraint(page);
      await navDataStructure(page);
    });

    test('Create data structure', async () => {
      await createDataStructure(page, dataStructure);
    });
    //test.slow()
    test('Find the new data structure in the table', async () => {
      await findDataStructure(page, dataStructure);
    });

    test('Delete new data structure', async () => {
      await deleteDataStructure(page);
    });

    test('Check toast', async () => {
      await checkAndCloseToast(page);
    });

  });

  test.describe('Edit new data structure', () => {
    const dataStructure = `test_edit-${+Date.now()}`;


    test('Check Constraint', async () => {
      await navDataStructure(page);
      await checkConstraint(page);
      await navDataStructure(page);
    });


    test('Create data structure', async () => {
      await createDataStructure(page, dataStructure);
    });
    //test.slow()
    test('Find the new data structure in the table', async () => {
      await findDataStructure(page, dataStructure);
    });
    test('Edit description data structure', async () => {
      test.slow();
      await editDataStructure(page);
    });

    test('Find the edited data structure in the table', async () => {
      await findEditedDataStructure(page, dataStructure);
    });

    test('Delete new data structure', async () => {
      await deleteDataStructure(page);
    });

    test('Check toast', async () => {
      await checkAndCloseToast(page);
    });

  });

});
