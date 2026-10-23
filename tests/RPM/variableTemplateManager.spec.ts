import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login } from '../shared';

test.describe('Variable Template Manager', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    page = await browser.newPage();
    await login(page);

  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Create form', () => {
    test('selects a unit without saving an incomplete template', async () => {

      // Click on setting icon
      await page.locator('#menu-settings').click();


      // Clicking on Variable template
      await page.click('text=Manage Variable Templates');

      // Clicking on create button
      await page.click('#create');

      // Click on name field and type test data
      await page.locator('#name').fill(`ui-variable-template-${Date.now()}`);


      // Click on description field and type test data
      await page.locator('#description').fill('Test');

      await page.fill('#unit', 'kg');
      const unitOption = page.getByText('kg/kg', { exact: true });
      await expect(unitOption).toBeVisible();
      await unitOption.click();
      await expect(page.locator('#unit').locator('xpath=..')).toContainText('kg/kg');
      await expect(page.locator('#save')).toBeDisabled();

    });
  });
});
