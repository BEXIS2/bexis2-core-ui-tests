import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const { checkTitle } = require('./utils/uniqueFunction');

const { navDataStructure , uploadDataStructure, findDataStructure, deleteDataStructure, checkAndCloseToast, editDataStructure, findEditedDataStructure, checkUploadDataStructure } = require('./utils/uploadDataStructureFunctions');

import { login, host } from '../shared';

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Upload Data Structure', () => {
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

    test('Check with Empty CSV', async () => {
      await checkUploadDataStructure(page, "isEmpty", "", "", "");
    });

    test(' 2nd Check with Check with Variables CSV', async () => {
      await checkUploadDataStructure(page, "", "hasVariables", "", "");
      await navDataStructure (page)
    });

    test(' 3rd Check with Variables And Unit CSV', async () => {
      await checkUploadDataStructure(page, "", "", "hasVariablesAndUnit", "");
      await navDataStructure (page)
    });
    test(' 4th Check with Variables Unit And Missing Values CSV ', async () => {
      await checkUploadDataStructure(page, "", "", "", "hasVariablesUnitAndMissingValues");
      await navDataStructure (page)
    });

  });

  test.describe('Upload new data structure', () => {
    const dataStructure = `test_new-${+Date.now()}`;
    // //   // test('should match the expected title', async () => {
    // //   await checkTitle(page, 'Data structure', '.w-full >> .table.table-compact', 'h1.h1');
    // // });


    test('Upload data structure', async () => {
      await uploadDataStructure(page, dataStructure);
    });
    //test.slow()
    test('Find the new uploaded data structure in the table', async () => {
      await findDataStructure(page, dataStructure);
    });

    test('Delete new uploaded data structure', async () => {
      await deleteDataStructure(page);
    });

    test('Check toast', async () => {
      await checkAndCloseToast(page);
    });

  });

  test.describe('Edit new uploaded data structure', () => {
    const dataStructure = `test_edit-${+Date.now()}`;

    test('Upload data structure', async () => {
      await uploadDataStructure(page, dataStructure);
    });
    //test.slow()
    test('Find the new uploaded data structure in the table', async () => {
      await findDataStructure(page, dataStructure);
    });
    test('Edit description on uploaded data structure', async () => {
      test.slow();
      await editDataStructure(page);
    });

    test('Find the edited uploaded data structure in the table', async () => {
      await findEditedDataStructure(page, dataStructure);
    });

    test('Delete edited uploaded data structure', async () => {
      await deleteDataStructure(page);
    });

    test('Check toast', async () => {
      await checkAndCloseToast(page);
    });

  });

});