import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';

test.describe.configure({ mode: 'serial' });

test.describe('Variable Template Structure', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page);

  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Create new Variable Template', () => {
    test('create form', async () => {

      // Click on setting icon
      await page.click('.fa.fa-cog');

      // Clicking on Variable template
      await page.click('text=Manage Variable Templates');

      // Clicking on create button
      await page.click('#create');

      // Click on name field and type test data
      await page.click('#name');
      await page.type('#name', 'ummaima');


      // Click on description field and type test data
      await page.click('#description');
      await page.type('#description', 'Test');

      await page.fill('#unit', 'kg');
      page.waitForTimeout(10000); // Wait for 10 seconds

      // Wait for the dropdown options to be visible. 
      // await page.waitForSelector('.svelte-select-list svelte-82qwg8');

      // Click on the option with the text 'kg/m^2'. 
      await page.click('text=kg/m^2');

    });
  });
});





