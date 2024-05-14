import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';
const { checkTitle } = require('./utils/uniqueFunction');

const { checkMeanings, createMeanings, findMeanings, deleteMeanings, editMeaning, findEditedMeanings } = require('./utils/meaningFunctions');

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Meanings', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await page.goto(`${host}/rpm/meaning/`); // Go to Meanings Manager page
  });

  test.afterAll(async () => {
    await page.close(); // Close the page after all tests
  });

  // Unique name for the meanings
  test.describe('Iterations for fields validation', () => {
    const meaningsIterate = `test_iterate-${+Date.now()}`;
    // test('Check title ', async () => {
    //   //Check with title name
    //   await checkTitle(page, 'Meanings', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test.slow
    test('Check with name field and  description', async () => {
      await checkMeanings(page, meaningsIterate, "Testing Meanings", "", "", "", "")
      test.slow
      await findMeanings(page, meaningsIterate);
      await deleteMeanings(page)
    });

    test('Check with name field, description and has relation', async () => {
      await checkMeanings(page, meaningsIterate, "Testing Meanings", "has relation ", "", "", "")
      test.slow
      await findMeanings(page, meaningsIterate);
      await deleteMeanings(page)
    });

    test('Check with name field, description, has relation, has approved', async () => {
      await checkMeanings(page, meaningsIterate, "Testing Meanings", "has relation", "has approved", "", "")
      test.slow
      await findMeanings(page, meaningsIterate);
      await deleteMeanings(page)
    });

    test('Check with name field, description, has relation, has approved and has selectable', async () => {
      await checkMeanings(page, meaningsIterate, "Testing Meanings", "has relation", "has approved", "has selectable", "")
      test.slow
      await findMeanings(page, meaningsIterate);
      await deleteMeanings(page)
    });

    // test('Check with name field, description, has relation, has constraint', async () => {
    //   await checkMeanings(page, meaningsIterate, "Testing Meanings", "has relation", "", "", "has constraint")
    //   test.slow
    //   await findMeanings(page, meaningsIterate);
    //   await deleteMeanings(page)
    // });

  });

  test.describe('Create new Meaning', () => {
    const meaning = `test_new-${+Date.now()}`;
    // test('should match the expected title', async () => {
    //   await checkTitle(page, 'Meanings', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test('Create Meaning', async () => {
      await createMeanings(page, meaning);
    });

    test('Find the new meaning in the table', async () => {
      await findMeanings(page, meaning);
    });

    test('Delete new meaning', async () => {
      await deleteMeanings(page);
    });

  });
  test.describe('Edit new Meaning', () => {
    const meaning = `test_edit-${+Date.now()}`;
    // test('should match the expected title', async () => {
    //   await checkTitle(page, 'Meanings', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test('Create Meaning', async () => {
      await createMeanings(page, meaning);
    });

    test('Find the new meaning in the table', async () => {
      await findMeanings(page, meaning);
    });

    test.slow()
    test('Edit description Meaning', async () => {
      test.slow();
      await editMeaning(page, meaning);
    });

    test('Find the edited meaning in the table', async () => {
      await findEditedMeanings(page, meaning);
    });

    test('Delete new meaning', async () => {
      await deleteMeanings(page, meaning);
    });

  });
});

