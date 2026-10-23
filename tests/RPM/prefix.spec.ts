import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

import { gotoApp, login } from '../shared';

const {
  checkPrefix,
  cleanupPrefix,
  createPrefix,
  deletePrefix,
  editPrefix,
  findEditedPrefix,
  findPrefix,
} = require('./utils/prefixFunctions');

const route = '/rpm/externallink/prefixcategory/';
const runId = `${Date.now()}-${process.pid}`;

function resourceName(prefix: string, testInfo: TestInfo) {
  return `${prefix}-${runId}-${testInfo.workerIndex}-${testInfo.retry}`;
}

test.describe('Prefix Category', () => {
  const pendingCleanup = new Set<string>();

  async function recordInlineCleanupError(
    testInfo: TestInfo,
    prefixName: string,
    cleanupError: unknown,
  ) {
    const message =
      cleanupError instanceof Error
        ? cleanupError.stack ?? cleanupError.message
        : String(cleanupError);

    testInfo.annotations.push({
      type: 'cleanup-error',
      description: `${prefixName}: ${message}`,
    });

    try {
      await testInfo.attach('prefix-cleanup-error', {
        body: `${prefixName}: ${message}`,
        contentType: 'text/plain',
      });
    } catch (attachmentError) {
      testInfo.annotations.push({
        type: 'cleanup-attachment-error',
        description:
          attachmentError instanceof Error
            ? attachmentError.message
            : String(attachmentError),
      });
    }
  }

  async function runWithInlineCleanup(
    page: Page,
    testInfo: TestInfo,
    prefixName: string,
    action: () => Promise<void>,
  ) {
    pendingCleanup.add(prefixName);
    let primaryFailed = false;

    try {
      await action();
    } catch (error) {
      primaryFailed = true;
      throw error;
    } finally {
      try {
        await cleanupPrefix(page, prefixName);
        pendingCleanup.delete(prefixName);
      } catch (cleanupError) {
        await recordInlineCleanupError(testInfo, prefixName, cleanupError);

        // Keep the resource queued for afterAll. If the assertions already
        // failed, retain that primary failure and report cleanup separately.
        if (!primaryFailed) {
          throw cleanupError;
        }
      }
    }
  }

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

      for (const prefixName of [...pendingCleanup]) {
        try {
          await cleanupPrefix(cleanupPage, prefixName);
          pendingCleanup.delete(prefixName);
        } catch (error) {
          cleanupErrors.push(`${prefixName}: ${error}`);
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
    expect([...pendingCleanup], 'Prefix Categories remained after fallback cleanup').toEqual([]);
  });

  test.describe('Iterations for fields validation', () => {
    test('Check with only description', async ({ page }) => {
      await checkPrefix(page, '', 'Test description');
    });

    test('Check with only prefix name', async ({ page }, testInfo) => {
      test.slow();
      const prefixName = resourceName('test_iterate-name', testInfo);
      await runWithInlineCleanup(page, testInfo, prefixName, async () => {
        await checkPrefix(page, prefixName, '');
        await findPrefix(page, prefixName);
      });
    });
  });

  test('Create, find and delete Prefix Category', async ({ page }, testInfo) => {
    test.slow();
    const prefixName = resourceName('test_new', testInfo);
    pendingCleanup.add(prefixName);

    await test.step('Create Prefix Category', async () => {
      await createPrefix(page, prefixName);
    });

    await test.step('Find the new Prefix Category in the table', async () => {
      await findPrefix(page, prefixName);
    });

    await test.step('Delete the new Prefix Category and verify absence', async () => {
      await deletePrefix(page, prefixName);
      pendingCleanup.delete(prefixName);
    });
  });

  test('Create, edit, find and delete Prefix Category', async ({ page }, testInfo) => {
    test.slow();
    const prefixName = resourceName('test_edit', testInfo);
    pendingCleanup.add(prefixName);

    await test.step('Create Prefix Category', async () => {
      await createPrefix(page, prefixName);
    });

    await test.step('Find the new Prefix Category in the table', async () => {
      await findPrefix(page, prefixName);
    });

    await test.step('Edit Prefix Category', async () => {
      await editPrefix(page, prefixName);
    });

    await test.step('Find the edited Prefix Category in the table', async () => {
      await findEditedPrefix(page, prefixName);
    });

    await test.step('Delete the edited Prefix Category and verify absence', async () => {
      await deletePrefix(page, prefixName);
      pendingCleanup.delete(prefixName);
    });
  });
});
