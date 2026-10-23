import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const { uploadDataStructure, findDataStructure, deleteDataStructure, checkAndCloseToast, editDataStructure, findEditedDataStructure, checkUploadDataStructure, cleanupDataStructure } = require('./utils/uploadDataStructureFunctions');

import { gotoApp, login } from '../shared';

test.describe('Upload Data Structure', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;
  const newDataStructure = `test_new-upload-${Date.now()}`;
  const editedDataStructure = `test_edit-upload-${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await gotoApp(page, '/rpm/datastructure', '#create');
  });

  test.beforeEach(async () => {
    await gotoApp(page, '/rpm/datastructure', '#create');
  });

  test.afterAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(120_000);
    const cleanupErrors: string[] = [];
    let cleanupPage: Page | undefined;

    try {
      cleanupPage = await browser.newPage();
      await login(cleanupPage);

      for (const name of [newDataStructure, editedDataStructure]) {
        try {
          await cleanupDataStructure(cleanupPage, name);
        } catch (error) {
          cleanupErrors.push(`${name}: ${error}`);
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

    test('Check with Empty CSV', async () => {
      await checkUploadDataStructure(page, "isEmpty", "", "", "");
    });

    test(' 2nd Check with Check with Variables CSV', async () => {
      await checkUploadDataStructure(page, "", "hasVariables", "", "");
    });

    test(' 3rd Check with Variables And Unit CSV', async () => {
      await checkUploadDataStructure(page, "", "", "hasVariablesAndUnit", "");
    });
    test(' 4th Check with Variables Unit And Missing Values CSV ', async () => {
      await checkUploadDataStructure(page, "", "", "", "hasVariablesUnitAndMissingValues");
    });

  });

  test.describe('Upload new data structure', () => {
    // //   // test('should match the expected title', async () => {
    // //   await checkTitle(page, 'Data structure', '.w-full >> .table.table-compact', 'h1.h1');
    // // });


    test('Upload, find and delete data structure', async () => {
      test.slow();

      await test.step('Upload data structure', async () => {
        await uploadDataStructure(page, newDataStructure);
      });
      await test.step('Find the new uploaded data structure in the table', async () => {
        await findDataStructure(page, newDataStructure);
      });
      await test.step('Delete new uploaded data structure', async () => {
        await deleteDataStructure(page, newDataStructure);
      });
      await test.step('Check toast', async () => {
        await checkAndCloseToast(page, newDataStructure);
      });
    });

  });

  test.describe('Edit new uploaded data structure', () => {

    test('Upload, edit, find and delete data structure', async () => {
      test.slow();

      await test.step('Upload data structure', async () => {
        await uploadDataStructure(page, editedDataStructure);
      });
      await test.step('Find the new uploaded data structure in the table', async () => {
        await findDataStructure(page, editedDataStructure);
      });
      await test.step('Edit uploaded data structure', async () => {
        await editDataStructure(page, editedDataStructure);
      });
      await test.step('Find the edited uploaded data structure in the table', async () => {
        await findEditedDataStructure(page, editedDataStructure);
      });
      await test.step('Delete edited uploaded data structure', async () => {
        await deleteDataStructure(page, editedDataStructure);
      });
      await test.step('Check toast', async () => {
        await checkAndCloseToast(page, editedDataStructure);
      });
    });

  });

});
