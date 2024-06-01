import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';
const { checkTitle } = require('./utils/uniqueFunction');

const { checkPrefix, createPrefix, findPrefix, deletePrefix, editPrefix, findEditedPrefix } = require('./utils/prefixFunctions');

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Prefix Category', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await page.goto(`${host}/rpm/externallink/prefixcategory/`); // Go to Prefix Category page
  });

  test.afterAll(async () => {
    await page.close(); // Close the page after all tests
  });

  // Unique name for the Prefix Category
  test.describe('Iterations for fields validation', () => {
    const prefixIterate = `test_iterate-${+Date.now()}`;
    // test('Check title ', async () => {
    //   //Check with title name
    //   await checkTitle(page, 'Prefix Category', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test.slow
    test('Check with only description', async () => {
      await checkPrefix(page,"","Test description")
    });

    test('Check with only prefix name', async () => {
      await checkPrefix(page, prefixIterate, "")
      await findPrefix (page,prefixIterate)
      await deletePrefix(page)
    });

  
  });

  test.describe('Create new Prefix Category', () => {
    const prefix = `test_new-${+Date.now()}`;
    // test('should match the expected title', async () => {
    //   await checkTitle(page, 'Prefix Category', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test('Create Prefix Category', async () => {
      await createPrefix(page, prefix);
    });

    test('Find the new Prefix in the table', async () => {
      await findPrefix(page, prefix);
    });

    test('Delete new Prefix Category', async () => {
      await deletePrefix(page);
    });

  });
  test.describe('Edit new Prefix Category', () => {
    const prefix = `test_edit-${+Date.now()}`;
    // test('should match the expected title', async () => {
    //   await checkTitle(page, 'Prefix Category', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test('Create Prefix Category', async () => {
      await createPrefix(page, prefix);
    });

    test('Find the new Prefix in the table', async () => {
      await findPrefix(page, prefix);
    });

    test.slow()
    test('Edit description Prefix Category', async () => {
      test.slow();
      await editPrefix(page, prefix);
    });
    test.slow()
    test('Find the edited Prefix Category in the table', async () => {
      await findEditedPrefix(page, prefix);
    });
    test.slow()
    test('Delete new Prefix Category', async () => {
      await deletePrefix(page);
    });

  });
});

