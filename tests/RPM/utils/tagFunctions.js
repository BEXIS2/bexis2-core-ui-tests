import { expect } from '@playwright/test';

async function openApplicationSettings(page) {
  await page.waitForSelector('#menu-settings', { state: 'visible' });
  await page.locator('#menu-settings').click();

  await page.waitForSelector('#menu-Application-Settings', { state: 'visible' });
  await page.locator('#menu-Application-Settings').click();
}

async function selectDataDiscovery(page) {
  const dataDiscoveryOption = page.locator(
    'div.listbox-item[data-testid="listbox-item"][role="option"]',
    {
      has: page.locator('input[type="radio"][name="medium"][value="ddm"]'),
    }
  );

  await expect(dataDiscoveryOption).toBeVisible();
  await expect(dataDiscoveryOption).toContainText('Data Discovery');

  await dataDiscoveryOption.click();
}

module.exports = {
  openApplicationSettings,
  selectDataDiscovery,
};