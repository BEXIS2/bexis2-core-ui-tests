import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

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

  test.describe('Create new Data Structure', () => {
    test('Upload a file', async () => {
        // button to open the dropzone form
        await page.locator('.btn.variant-filled-secondary').click();

        // check if the form is visible
        await expect(page.locator('form')).toBeVisible();

        // check if the add empty data structure button is visible
        // click on it and check redirected url
        const addDataBtn = page.locator('.btn.variant-filled-primary.grow')
        await expect(addDataBtn).toBeVisible();
        await addDataBtn.click();
        await expect(page.url()).toContain(`${host}/rpm/datastructure/create?file=`);

    });
  });

});