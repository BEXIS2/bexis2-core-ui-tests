import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Tags / Application Settings', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page);
    await page.goto(`${host}`);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Open settings and select Data Discovery', async () => {
    // Settings öffnen
    await page.waitForSelector('#menu-settings', { state: 'visible' });
    await page.locator('#menu-settings').click();

    // Application Settings öffnen
    await page.waitForSelector('#menu-Application-Settings', { state: 'visible' });
    await page.locator('#menu-Application-Settings').click();

    // Data Discovery auswählen
    const dataDiscoveryOption = page.locator(
      'div.listbox-item[data-testid="listbox-item"][role="option"]',
      {
        has: page.locator('input[type="radio"][name="medium"][value="ddm"]'),
      }
    );

    await expect(dataDiscoveryOption).toBeVisible();
    await expect(dataDiscoveryOption).toContainText('Data Discovery');

    await dataDiscoveryOption.click();
  });
});