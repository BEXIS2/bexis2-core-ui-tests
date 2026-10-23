import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

import { gotoApp, login } from '../shared';

const {
  checkExternalLink,
  cleanupExternalLink,
  createExternalLink,
  deleteExternalLink,
  editExternalLink,
  findEditedExternalLink,
  findExternalLink,
} = require('./utils/externalLinkFunctions');

const route = '/rpm/externallink';
const runId = `${Date.now()}-${process.pid}`;

function resourceName(prefix: string, testInfo: TestInfo) {
  return `${prefix}-${runId}-${testInfo.workerIndex}-${testInfo.retry}`;
}

test.describe('External Links', () => {
  const pendingCleanup = new Set<string>();

  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoApp(page, route, '#create');
  });

  test.afterAll(async ({ browser }, testInfo) => {
    if (pendingCleanup.size === 0) return;

    testInfo.setTimeout(Math.max(120_000, 30_000 + pendingCleanup.size * 45_000));
    const cleanupErrors: string[] = [];
    let cleanupPage: Page | undefined;

    try {
      cleanupPage = await browser.newPage();
      await login(cleanupPage);

      for (const linkName of [...pendingCleanup]) {
        try {
          await cleanupExternalLink(cleanupPage, linkName);
          pendingCleanup.delete(linkName);
        } catch (error) {
          cleanupErrors.push(`${linkName}: ${error}`);
        }
      }
    } catch (error) {
      cleanupErrors.push(`cleanup setup: ${error}`);
    } finally {
      if (cleanupPage && !cleanupPage.isClosed()) {
        try {
          await cleanupPage.close();
        } catch (error) {
          cleanupErrors.push(`cleanup page close: ${error}`);
        }
      }
    }

    expect(cleanupErrors, cleanupErrors.join('\n')).toEqual([]);
    expect([...pendingCleanup], 'External Links remained after fallback cleanup').toEqual([]);
  });

  test.describe('Iterations for fields validation', () => {
    test('Check with name field and has type', async ({ page }) => {
      await checkExternalLink(page, `test_iterate-${runId}-type`, 'link', '', '');
    });

    test('Check with name field, has type and prefix', async ({ page }) => {
      await checkExternalLink(page, `test_iterate-${runId}-prefix`, 'link', 'dwc', '');
    });

    test('Check with name field and has URI', async ({ page }) => {
      await checkExternalLink(page, `test_iterate-${runId}-uri`, '', '', 'test@testing.com');
    });
  });

  test('Create, find and delete External Link', async ({ page }, testInfo) => {
    test.slow();
    const externalLink = resourceName('test_new', testInfo);
    pendingCleanup.add(externalLink);

    await test.step('Create External Link', async () => {
      await createExternalLink(page, externalLink);
    });

    await test.step('Find the new External Link in the table', async () => {
      await findExternalLink(page, externalLink);
    });

    await test.step('Delete the new External Link and verify absence', async () => {
      await deleteExternalLink(page, externalLink);
      pendingCleanup.delete(externalLink);
    });
  });

  test('Create, edit, find and delete External Link', async ({ page }, testInfo) => {
    test.slow();
    const externalLink = resourceName('test_edit', testInfo);
    pendingCleanup.add(externalLink);

    await test.step('Create External Link', async () => {
      await createExternalLink(page, externalLink);
    });

    await test.step('Find the new External Link in the table', async () => {
      await findExternalLink(page, externalLink);
    });

    await test.step('Edit External Link', async () => {
      await editExternalLink(page, externalLink);
    });

    await test.step('Find the edited External Link in the table', async () => {
      await findEditedExternalLink(page, externalLink);
    });

    await test.step('Delete the edited External Link and verify absence', async () => {
      await deleteExternalLink(page, externalLink);
      pendingCleanup.delete(externalLink);
    });
  });
});
