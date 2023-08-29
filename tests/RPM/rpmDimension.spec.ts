import { test, expect, type Page } from '@playwright/test';

import { login, host } from '../shared';

// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('RPM Dimension', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await page.goto(`${host}/rpm/dimension/`); // Go to DimensionManager page
  });

  test.afterAll(async () => {
    await page.close(); // Close the page after all tests
  });

  test('Title', async () => {
    // Check the title of the table
    const title = await page
      .locator('.w-full', { has: page.locator('.table.table-compact') })
      .locator('h1.h1');
    await expect(title).toHaveText('Dimensions');
  });

  // Unique name for the dimension
  const dimension = `test-${+Date.now()}`;

  test.describe('Create new Dimension', () => {
    test('Title', async () => {
      const title = await page
        .locator('.w-full', { has: page.locator('.table.table-compact') })
        .locator('div.h3');
      await expect(title).toHaveText('Create neẇ Dimension');
    });

    test('Fill the form and check toast', async () => {
      await page.locator('#create').click();
      await page.locator('input[id=name]').fill(dimension);
      await page
        .locator('input[id=specification]')
        .fill('L(0,0)M(0,0)T(0,0)I(0,0)Θ(0,0)N(0,0)J(0,1)');
      await page.locator('textarea[id=description]').fill('Test dimension');
      await page.locator('button[id=save]').click();

      // Wait until the toast appears
      await page.waitForSelector('.toast[data-testid=toast] .text-base');

      // Check the toast message
      const toast = await page.locator('.toast[data-testid=toast]');
      await expect(await toast.locator('.text-base')).toHaveText(
        `Unit "${dimension}" saved.`
      );
      await toast.locator('button').click(); // Close the toast
    });

    test('Find the new dimension in the table', async () => {
      // Search for the new dimension
      await page.locator('#Units-search').fill(dimension);
      // Get the row
      const row = page.locator('[id^=Units-row-]');
      await expect(row).toHaveCount(1);
      // Get the index of the dimension
      const id = (await row.getAttribute('id')) as string;
      const index = id.split('-')[2];
      // Check the values
      await expect(page.locator(`#Units-name-${index}`)).toHaveText(dimension);
      await expect(page.locator(`#Units-description-${index}`)).toHaveText(
        'Test dimension'
      );
      await expect(page.locator(`#Units-specification-${index}`)).toHaveText(
        'L(0,0)M(0,0)T(0,0)I(0,0)Θ(0,0)N(0,0)J(0,1)'
      );
    });
  });

  test.describe('Edit new Dimension', () => {
    // Check the title
    test('Title', async () => {
      await page.getByTitle(`Edit Unit, ${dimension}`).click(); // Click on the edit button

      const title = await page
        .locator('.w-full', { has: page.locator('.table.table-compact') })
        .locator('div.h3');
      await expect(title).toHaveText(dimension);
    });

    // Edit description
    test('Edit description', async () => {
      await page
        .locator('textarea[id=description]')
        .fill('Test dimension edited');
      await page.locator('input[id=name]').fill(dimension);
      await page
        .locator('input[id=specification]')
        .fill('L(0,0)M(0,0)T(0,0)I(0,0)Θ(0,0)N(0,0)J(0,1)');
      await page.locator('button[id=save]').click();

      // Wait until the toast appears
      await page.waitForSelector('.toast[data-testid=toast] .text-base');

      // Check the toast message
      const toast = await page.locator('.toast[data-testid=toast]');
      await expect(await toast.locator('.text-base')).toHaveText(
        `Unit "${dimension}" saved.`
      );
      await toast.locator('button').click(); // Close the toast
    });

    test('Find the edited dimension in the table', async () => {
      // Search for the dimension
      await page.locator('#Units-search').fill(dimension);
      // Get the row
      const row = page.locator('[id^=Units-row-]');
      await expect(row).toHaveCount(1);
      // Get the index of the dimension
      const id = (await row.getAttribute('id')) as string;
      const index = id.split('-')[2];
      // Check the values
      await expect(page.locator(`#Units-name-${index}`)).toHaveText(dimension);
      await expect(page.locator(`#Units-description-${index}`)).toHaveText(
        'Test dimension edited'
      );
      await expect(page.locator(`#Units-specification-${index}`)).toHaveText(
        'L(0,0)M(0,0)T(0,0)I(0,0)Θ(0,0)N(0,0)J(0,1)'
      );
    });
  });

  test.describe('Delete new Dimension', () => {
    test('Delete Dimension', async () => {
      // Click on the delete button
      await page.getByTitle(`Delete Unit, ${dimension}`).click();

      // Wait until the modal appears
      await page.waitForSelector('.modal');

      // Check the modal title
      await expect(page.locator('.modal-header')).toHaveText('Delete Unit');
      await expect(page.locator('.modal-body')).toHaveText(
        `Are you sure you wish to delete Dimension "${dimension}" (L(0,0)M(0,0)T(0,0)I(0,0)Θ(0,0)N(0,0)J(0,1))?`
      );

      // Click Confirm
      await page
        .locator('.modal-footer')
        .locator('button.variant-filled')
        .click();
    });

    test('Check toast', async () => {
      // Wait until the toast appears
      await page.waitForSelector('.toast[data-testid=toast] .text-base');

      // Check the toast message
      const toast = await page.locator('.toast[data-testid=toast]');
      await expect(await toast.locator('.text-base')).toHaveText(
        `Dimension "${dimension}" deleted.`
      );

      await toast.locator('button').click(); // Close the toast
    });
  });
});
