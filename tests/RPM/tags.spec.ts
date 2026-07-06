import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';

test.describe('Tags / Application Settings and Tag Info', () => {
  let page: Page;

  // HIER sammeln wir alle erzeugten Dataset-IDs
  const datasetIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page);
    await page.goto(`${host}`);

    // ---------------------------
    // SETTINGS EINMAL AKTIVIEREN
    // ---------------------------
    await page.locator('#menu-settings').click();
    await page.locator('#menu-Application-Settings').click();

    const dataDiscoveryOption = page.locator(
      'div.listbox-item[data-testid="listbox-item"][role="option"]',
      {
        has: page.locator('input[type="radio"][name="medium"][value="ddm"]'),
      }
    );

    await expect(dataDiscoveryOption).toBeVisible();
    await dataDiscoveryOption.click();

    const ensureSwitchOn = async (text: string) => {
      const toggle = page
        .locator('[data-testid="slide-toggle"]')
        .filter({ hasText: text });

      const isOn = (await toggle.getAttribute('aria-checked')) === 'true';
      if (!isOn) await toggle.click();
    };

    const ensureSwitchOff = async (text: string) => {
      const toggle = page
        .locator('[data-testid="slide-toggle"]')
        .filter({ hasText: text });

      const isOn = (await toggle.getAttribute('aria-checked')) === 'true';
      if (isOn) await toggle.click();
    };

    await ensureSwitchOn('Activate tags to summarize versions (key: use_tags)');
    await ensureSwitchOn('Use minor tags (key: use_minor)');
    await ensureSwitchOff(
      'Manage release tags requires curator (key: curator_required_for_tags)'
    );

    await page.locator('button.variant-filled-primary[type="submit"]').click();
  });

  test.afterAll(async () => {
    await page.close();
  });

  // ---------------------------
  // HELPER: Dataset erstellen
  // ---------------------------
  const createDataset = async () => {
    await page.goto(`${host}`);

    await page.locator('a[href="/dcm/create"]').click();

    const fileTile = page
      .locator('div[role="button"]')
      .filter({ has: page.locator('h3', { hasText: 'File' }) });

    await fileTile.click();

    await page.locator('input#Title').fill('UI Testdataset / Tags');
    await page.locator('textarea#Description').fill('This is a test description');

    await page
      .locator('button[title="Create a new dataset and continue editing"]')
      .click();

    await page.waitForURL('**/dcm/edit/**');

    const id = new URL(page.url()).searchParams.get('id');
    expect(id).toBeTruthy();

    datasetIds.push(id!);
    return id!;
  };

  // ---------------------------
  // CASE 1 - MAJOR
  // ---------------------------
  test('Case 1 - Create Major version', async () => {
    const id = await createDataset();

    await page.goto(`${host}/ddm/taginfo/?id=${id}`);

    const majorButton = page.locator(
      'button[title="Create new major version. All untagged versions until this will belong to this major version."]'
    );

    await expect(majorButton).toBeVisible();
    await majorButton.click();

    const toast = page.locator('[data-testid="toast"]');
    await expect(toast).toContainText('Release Tag is generated.');
  });

  // ---------------------------
  // CASE 2 - MINOR
  // ---------------------------
  test('Case 2 - Create Minor version', async () => {
    const id = await createDataset();

    await page.goto(`${host}/ddm/taginfo/?id=${id}`);

    const minorButton = page.locator(
      'button[title="Create new minor version. All untagged versions until this will belong to this minor version."]'
    );

    await expect(minorButton).toBeVisible();
    await minorButton.click();

    const toast = page.locator('[data-testid="toast"]');
    await expect(toast).toContainText('Release Tag is generated.');
  });

  // ---------------------------
  // CLEANUP - PURGE ALLE DATASETS
  // ---------------------------
  test('Cleanup - purge all created datasets', async () => {
    for (const id of datasetIds) {
      await page.goto(`${host}/sam/datasets/index/datasets`);

      const purgeLink = page.locator(
        `a[href="/SAM/datasets/Purge/${id}"]`
      );

      await expect(purgeLink).toBeVisible();

      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });

      await purgeLink.click();
    }
  });
});