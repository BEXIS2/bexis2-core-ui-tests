import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';
const { checkTitle } = require('./utils/uniqueFunction');

const { checkExternalLink, createExternalLink, findExternalLink, deleteExternalLink, editExternalLink, findEditedExternalLink } = require('./utils/externalLinkFunctions');

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('External Links', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await page.goto(`${host}/rpm/externallink`); // Go to External Link Manager page
  });

  test.afterAll(async () => {
    await page.close(); // Close the page after all tests
  });

  // Unique name for the External Link
  test.describe('Iterations for fields validation', () => {
    const linkIterate = `test_iterate-${+Date.now()}`;
    // test('Check title ', async () => {
    //   //Check with title name
    //   await checkTitle(page, 'External Link', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test.slow
    test('Check with name field and has type', async () => {
      await checkExternalLink(page, linkIterate, "link", "", "")
    });

    test('Check with name field, has type and prefix', async () => {
      await checkExternalLink(page, linkIterate, "link", "dwc", "")
    });

    test('Check with name field and  has URI', async () => {
      await checkExternalLink(page, linkIterate, "", "", "test@testing.com")
      await findExternalLink(page, linkIterate)
      await deleteExternalLink(page, linkIterate)
    });

  });

  test.describe('Create new External Link', () => {
    const externalLink = `test_new-${+Date.now()}`;
    // test('should match the expected title', async () => {
    //   await checkTitle(page, 'External Link', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test('Create External Link', async () => {
      await createExternalLink(page, externalLink);
    });

    test('Find the new External Link in the table', async () => {
      await findExternalLink(page, externalLink);
    });

    test('Delete new External Link', async () => {
      await deleteExternalLink(page);
    });

  });
  test.describe('Edit new External Link', () => {
    const externalLink = `test_edit-${+Date.now()}`;
    // test('should match the expected title', async () => {
    //   await checkTitle(page, 'External Link', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test('Create External Link', async () => {
      await createExternalLink(page, externalLink);
    });

    test('Find the new External Link in the table', async () => {
      await findExternalLink(page, externalLink);
    });

    test.slow()
    test('Edit description External Link', async () => {
      test.slow();
      await editExternalLink(page, externalLink);
    });
    test.slow()
    test('Find the edited External Link in the table', async () => {
      await findEditedExternalLink(page, externalLink);
    });
    test.slow()
    test('Delete new External Link', async () => {
      await deleteExternalLink(page);
    });

  });
});

