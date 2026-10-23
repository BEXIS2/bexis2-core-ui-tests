import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const { navDataStructure, checkConstraint, createDataStructure, findDataStructure, deleteDataStructure, checkAndCloseToast, editDataStructure, findEditedDataStructure, checkDataStructure, cleanupDataStructure } = require('./utils/dataStructureFunctions');

import { gotoApp, login } from '../shared';

test.describe('Data Structure', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;
  const iterationDataStructure = `test_iterate-${Date.now()}`;
  const newDataStructure = `test_new-${Date.now()}`;
  const editedDataStructure = `test_edit-${Date.now()}`;

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
    test('Check with title and title description field ', async () => {
      await checkDataStructure(page, iterationDataStructure, "Test data structure", "", "", "", "", "", "");
    });

    test('Check with title, title description and hasPrimaryKey field', async () => {
      await checkDataStructure(page, iterationDataStructure, "Test data structure", "hasPrimaryKey", "", "", "", "", "");
    });

    test('Check with title, title description and hasOptionalValue field', async () => {
      await checkDataStructure(page, iterationDataStructure, "Test data structure", "", "hasOptionalValue", "", "", "", "");
    });

    test('Check with title, title description, name, description and hasPrimaryKey field', async () => {
      await checkDataStructure(page, iterationDataStructure, "Test data structure", "hasPrimaryKey", "", iterationDataStructure, "Test data structure", "", "");
    });
    test('Check with title, title description, name, description and hasOptionalValue field', async () => {
      await checkDataStructure(page, iterationDataStructure, "Test data structure", "", "hasOptionalValue", iterationDataStructure, "Test data structure", "", "");
    });

    test('Check with title, title description, name, description, hasPrimaryKey, hasOptionalValue and hasDataType field', async () => {
      await checkDataStructure(page, iterationDataStructure, "Test data structure", "hasPrimaryKey", "hasOptionalValue", iterationDataStructure, "Test data structure", "hasDataType", "");
      // await findDataStructure(page, dataStructure);
      // await deleteDataStructure(page);
      // await checkAndCloseToast(page);



    });

    test('Check with title, title description, name, description, hasPrimaryKey, hasOptionalValue and hasUnit field', async () => {
      await checkDataStructure(page, iterationDataStructure, "Test data structure", "hasPrimaryKey", "hasOptionalValue", iterationDataStructure, "Test data structure", "", "hasUnit");
    });


  });

  test.describe('Create new data structure', () => {
    //   // test('should match the expected title', async () => {
    //   await checkTitle(page, 'Data structure', '.w-full >> .table.table-compact', 'h1.h1');
    // });
    test('Check Constraint', async () => {
      await navDataStructure(page);
      await checkConstraint(page);
      await navDataStructure(page);
    });

    test('Create, find and delete data structure', async () => {
      test.slow();

      await test.step('Create data structure', async () => {
        await createDataStructure(page, newDataStructure);
      });
      await test.step('Find the new data structure in the table', async () => {
        await findDataStructure(page, newDataStructure);
      });
      await test.step('Delete new data structure', async () => {
        await deleteDataStructure(page, newDataStructure);
      });
      await test.step('Check toast', async () => {
        await checkAndCloseToast(page, newDataStructure);
      });
    });

  });

  test.describe('Edit new data structure', () => {


    test('Check Constraint', async () => {
      await navDataStructure(page);
      await checkConstraint(page);
      await navDataStructure(page);
    });


    test('Create, edit, find and delete data structure', async () => {
      test.slow();

      await test.step('Create data structure', async () => {
        await createDataStructure(page, editedDataStructure);
      });
      await test.step('Find the new data structure in the table', async () => {
        await findDataStructure(page, editedDataStructure);
      });
      await test.step('Edit description data structure', async () => {
        await editDataStructure(page, editedDataStructure);
      });
      await test.step('Find the edited data structure in the table', async () => {
        await findEditedDataStructure(page, editedDataStructure);
      });
      await test.step('Delete edited data structure', async () => {
        await deleteDataStructure(page, editedDataStructure);
      });
      await test.step('Check toast', async () => {
        await checkAndCloseToast(page, editedDataStructure);
      });
    });

  });

});
