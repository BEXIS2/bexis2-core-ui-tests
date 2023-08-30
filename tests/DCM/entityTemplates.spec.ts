import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Entity Templates', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await page.goto(`${host}/dcm/entitytemplates/`); // Go to Entity Templates page
  });

  test.afterAll(async () => {
    await page.close(); // Close the page after all tests
  });

  test.describe('Create new Entity Template', () => {
    test('Fill in the essentials', async () => {
      // Open the form
      await page.locator('button[title=create]').click();
      // Fill in the name
      await page.locator('#name').fill('Test');
      // Choose the entity type
      await page.locator('#entityType').selectOption('1');
      // Fill in the description
      await page.locator('#description').fill('Test description');
      // Wait for the requests to finish
      await page.waitForLoadState('domcontentloaded');
    });

    test('Fill in Metadata', async () => {
      // Choose the metadata structure
      await page.locator('#metadataStructure').selectOption('2');
      await page.locator('#metadataStructure').selectOption('1');

      // Choose required fields
      await page
        .locator('#metadataFields-container .svelte-select.multi')
        .click();
      await page
        .locator(
          '#metadataFields-container .list-item .item:has-text("Description")'
        )
        .click();
      await page
        .locator('#metadataFields-container .svelte-select.multi')
        .click();
      await page
        .locator(
          '#metadataFields-container .list-item .item:has-text("ProjectTitle")'
        )
        .click();
    });

    test('Fill in Dataset Settings', async () => {
      // Choose dataset components to be disabled
      await page
        .locator('#disabledHooks-container .svelte-select.multi')
        .click();
      await page
        .locator(
          '#disabledHooks-container .list-item .item:has-text("File Upload")'
        )
        .click();
      await page
        .locator('#disabledHooks-container .svelte-select.multi')
        .click();
      await page
        .locator(
          '#disabledHooks-container .list-item .item:has-text("Data Description")'
        )
        .click();

      // Choose allowed file types for file upload
      await page
        .locator('#allowedFileTypes-container .svelte-select.multi')
        .click();
      await page
        .locator(
          '#allowedFileTypes-container .list-item .item:has-text(".avi")'
        )
        .click();
      await page
        .locator('#allowedFileTypes-container .svelte-select.multi')
        .click();
      await page
        .locator(
          '#allowedFileTypes-container .list-item .item:has-text(".bmp")'
        )
        .click();
    });

    test('Save and verify the created entity template', async () => {
      // Click save
      await page.locator('button[title=save]').click();

      // Verify entity's existence and contents
      const card = await page.locator('.card', {
        has: page.locator('header h2:has-text("Test")'),
      });
      await expect(
        card.locator('header .badge.variant-filled-surface')
      ).toHaveText('Basic ABCD');
      await expect(
        card.locator('header .badge.variant-filled-secondary')
      ).toHaveText('Dataset');
      await expect(card.locator('blockquote')).toHaveText('Test description');
      await expect(card.locator('i')).toHaveText(
        'Restricted to these file types: .avi, .bmp'
      );
    });
  });

  test.describe('Delete the edited Entity Template', () => {
    test('Delete and verify', async () => {
      const card = await page.locator('.card', {
        has: page.locator('header h2:has-text("Test")'),
      });

      // Click delete
      await card.locator('button[title=delete]').click();

      // Wait until the modal appears
      await page.waitForSelector('.modal');

      // Check the modal title
      await expect(page.locator('.modal-header')).toHaveText('Please Confirm');
      await expect(page.locator('.modal-body')).toHaveText(
        'Are you sure you wish to remove?'
      );

      // Click Confirm
      await page
        .locator('.modal-footer')
        .locator('button.variant-filled')
        .click();

			// Verify the entity template is deleted
			await expect(card).not.toBeVisible();
    });
  });
});
