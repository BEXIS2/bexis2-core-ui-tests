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
// CASE 1 - MAJOR - ACTIVATE SHOW NOTE
// ---------------------------
test('Case 1 - Create Major version - Activate Show Note - Save - Wait for Notifcation', async () => {
  const id = await createDataset();

  await page.goto(`${host}/ddm/taginfo/?id=${id}`);

  const majorButton = page.locator(
    'button[title="Create new major version. All untagged versions until this will belong to this major version."]'
  );

  await expect(majorButton).toBeVisible();
  await majorButton.click();

  let toast = page.locator('[data-testid="toast"]').last();
  await expect(toast).toContainText('Release Tag is generated.', {
    timeout: 5000,
  });

  const showTagInfoSwitch = page
    .locator('[id^="showTagInfo-"]')
    .first()
    .locator('xpath=ancestor::div[@role="switch"]');

  await expect(showTagInfoSwitch).toBeVisible();
  await showTagInfoSwitch.click();

  const saveButton = page.locator('[id^="saveTagInfo-"]').first();

  await expect(saveButton).toBeVisible();
  await saveButton.click();

  toast = page.locator('[data-testid="toast"]').last();
  await toast.waitFor({ state: 'visible', timeout: 5000 });

  await expect(toast).toContainText('Release tag changes are saved.', {
    timeout: 5000,
  });
});

// ---------------------------
// CASE 2 - MAJOR - ACTIVATE SHOW NOTE & PUBLISH TAG
// ---------------------------
test('Case 2 - Create Major version - Activate Show Note & Publish Tag - Save - Wait for Notifcation', async () => {
  const id = await createDataset();

  await page.goto(`${host}/ddm/taginfo/?id=${id}`);

  const majorButton = page.locator(
    'button[title="Create new major version. All untagged versions until this will belong to this major version."]'
  );

  await expect(majorButton).toBeVisible();
  await majorButton.click();

  let toast = page.locator('[data-testid="toast"]').last();
  await expect(toast).toContainText('Release Tag is generated.', {
    timeout: 5000,
  });

  const showTagInfoSwitch = page
    .locator('[id^="showTagInfo-"]')
    .first()
    .locator('xpath=ancestor::div[@role="switch"]');

  await expect(showTagInfoSwitch).toBeVisible();
  await showTagInfoSwitch.click();

  const publishTagSwitch = page
    .locator('[id^="publish-"]')
    .first()
    .locator('xpath=ancestor::div[@role="switch"]');

  await expect(publishTagSwitch).toBeVisible();
  await publishTagSwitch.click();

  const saveButton = page.locator('[id^="saveTagInfo-"]').first();

  await expect(saveButton).toBeVisible();
  await saveButton.click();

  toast = page.locator('[data-testid="toast"]').last();
  await toast.waitFor({ state: 'visible', timeout: 5000 });

  await expect(toast).toContainText('Release tag changes are saved.', {
    timeout: 5000,
  });
});

// ---------------------------
// CASE 3 - MAJOR - ACTIVATE PUBLISH TAG ONLY
// ---------------------------
test('Case 3 - Create Major version - Activate Publish Tag - Save - Wait for Notification', async () => {
  const id = await createDataset();

  await page.goto(`${host}/ddm/taginfo/?id=${id}`);

  const majorButton = page.locator(
    'button[title="Create new major version. All untagged versions until this will belong to this major version."]'
  );

  await expect(majorButton).toBeVisible();
  await majorButton.click();

  let toast = page.locator('[data-testid="toast"]').last();
  await expect(toast).toContainText('Release Tag is generated.', {
    timeout: 5000,
  });

  const publishTagSwitch = page
    .locator('[id^="publish-"]')
    .first()
    .locator('xpath=ancestor::div[@role="switch"]');

  await expect(publishTagSwitch).toBeVisible();
  await publishTagSwitch.click();

  const saveButton = page.locator('[id^="saveTagInfo-"]').first();

  await expect(saveButton).toBeVisible();
  await saveButton.click();

  toast = page.locator('[data-testid="toast"]').last();
  await toast.waitFor({ state: 'visible', timeout: 5000 });

  await expect(toast).toContainText('Release tag changes are saved.', {
    timeout: 5000,
  });
});

// ---------------------------
// CASE 4 - MINOR - ACTIVATE SHOW NOTE
// ---------------------------
test('Case 4 - Create Minor version - Activate Show Note - Save - Wait for Notification', async () => {
  const id = await createDataset();

  await page.goto(`${host}/ddm/taginfo/?id=${id}`);

  const minorButton = page.locator(
    'button[title="Create new minor version. All untagged versions until this will belong to this minor version."]'
  );

  await expect(minorButton).toBeVisible();
  await minorButton.click();

  let toast = page.locator('[data-testid="toast"]').last();
  await expect(toast).toContainText('Release Tag is generated.', {
    timeout: 5000,
  });

  const showTagInfoSwitch = page
    .locator('[id^="showTagInfo-"]')
    .first()
    .locator('xpath=ancestor::div[@role="switch"]');

  await expect(showTagInfoSwitch).toBeVisible();
  await showTagInfoSwitch.click();

  const saveButton = page.locator('[id^="saveTagInfo-"]').first();

  await expect(saveButton).toBeVisible();
  await saveButton.click();

  toast = page.locator('[data-testid="toast"]').last();
  await toast.waitFor({ state: 'visible', timeout: 5000 });

  await expect(toast).toContainText('Release tag changes are saved.', {
    timeout: 5000,
  });
});

// ---------------------------
// CASE 5 - MINOR - ACTIVATE SHOW NOTE & PUBLISH TAG
// ---------------------------
test('Case 5 - Create Minor version - Activate Show Note & Publish Tag - Save - Wait for Notification', async () => {
  const id = await createDataset();

  await page.goto(`${host}/ddm/taginfo/?id=${id}`);

  const minorButton = page.locator(
    'button[title="Create new minor version. All untagged versions until this will belong to this minor version."]'
  );

  await expect(minorButton).toBeVisible();
  await minorButton.click();

  let toast = page.locator('[data-testid="toast"]').last();
  await expect(toast).toContainText('Release Tag is generated.', {
    timeout: 5000,
  });

  const showTagInfoSwitch = page
    .locator('[id^="showTagInfo-"]')
    .first()
    .locator('xpath=ancestor::div[@role="switch"]');

  await expect(showTagInfoSwitch).toBeVisible();
  await showTagInfoSwitch.click();

  const publishTagSwitch = page
    .locator('[id^="publish-"]')
    .first()
    .locator('xpath=ancestor::div[@role="switch"]');

  await expect(publishTagSwitch).toBeVisible();
  await publishTagSwitch.click();

  const saveButton = page.locator('[id^="saveTagInfo-"]').first();

  await expect(saveButton).toBeVisible();
  await saveButton.click();

  toast = page.locator('[data-testid="toast"]').last();
  await toast.waitFor({ state: 'visible', timeout: 5000 });

  await expect(toast).toContainText('Release tag changes are saved.', {
    timeout: 5000,
  });
});

// ---------------------------
// CASE 6 - MINOR - ACTIVATE PUBLISH TAG ONLY
// ---------------------------
test('Case 6 - Create Minor version - Activate Publish Tag - Save - Wait for Notification', async () => {
  const id = await createDataset();

  await page.goto(`${host}/ddm/taginfo/?id=${id}`);

  const minorButton = page.locator(
    'button[title="Create new minor version. All untagged versions until this will belong to this minor version."]'
  );

  await expect(minorButton).toBeVisible();
  await minorButton.click();

  let toast = page.locator('[data-testid="toast"]').last();
  await expect(toast).toContainText('Release Tag is generated.', {
    timeout: 5000,
  });

  const publishTagSwitch = page
    .locator('[id^="publish-"]')
    .first()
    .locator('xpath=ancestor::div[@role="switch"]');

  await expect(publishTagSwitch).toBeVisible();
  await publishTagSwitch.click();

  const saveButton = page.locator('[id^="saveTagInfo-"]').first();

  await expect(saveButton).toBeVisible();
  await saveButton.click();

  toast = page.locator('[data-testid="toast"]').last();
  await toast.waitFor({ state: 'visible', timeout: 5000 });

  await expect(toast).toContainText('Release tag changes are saved.', {
    timeout: 5000,
  });
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