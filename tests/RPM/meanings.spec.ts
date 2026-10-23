import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

import { gotoApp, login } from '../shared';

const {
  checkMeanings,
  cleanupMeaning,
  createMeanings,
  deleteMeanings,
  editMeaning,
  findEditedMeanings,
  findMeanings,
} = require('./utils/meaningFunctions');

const route = '/rpm/meaning/';
const runId = `${Date.now()}-${process.pid}`;

function resourceName(prefix: string, testInfo: TestInfo) {
  return `${prefix}-${runId}-${testInfo.workerIndex}-${testInfo.retry}`;
}

test.describe('Meanings', () => {
  const pendingCleanup = new Set<string>();

  async function recordInlineCleanupError(
    testInfo: TestInfo,
    meaningName: string,
    cleanupError: unknown,
  ) {
    const message =
      cleanupError instanceof Error
        ? cleanupError.stack ?? cleanupError.message
        : String(cleanupError);

    testInfo.annotations.push({
      type: 'cleanup-error',
      description: `${meaningName}: ${message}`,
    });

    try {
      await testInfo.attach('meaning-cleanup-error', {
        body: `${meaningName}: ${message}`,
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

      for (const meaningName of [...pendingCleanup]) {
        try {
          await cleanupMeaning(cleanupPage, meaningName);
          pendingCleanup.delete(meaningName);
        } catch (error) {
          cleanupErrors.push(`${meaningName}: ${error}`);
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
    expect([...pendingCleanup], 'Meanings remained after fallback cleanup').toEqual([]);
  });

  async function validateAndRemoveMeaning(
    page: Page,
    testInfo: TestInfo,
    meaningName: string,
    hasRelation: string,
    hasApproved: string,
    hasSelectable: string,
  ) {
    pendingCleanup.add(meaningName);
    let primaryFailed = false;

    try {
      await checkMeanings(
        page,
        meaningName,
        'Testing Meanings',
        hasRelation,
        hasApproved,
        hasSelectable,
        '',
      );
      await findMeanings(page, meaningName);
    } catch (error) {
      primaryFailed = true;
      throw error;
    } finally {
      try {
        await cleanupMeaning(page, meaningName);
        pendingCleanup.delete(meaningName);
      } catch (cleanupError) {
        await recordInlineCleanupError(testInfo, meaningName, cleanupError);

        // Keep the resource queued for afterAll. If the assertions already
        // failed, retain that primary failure and report cleanup separately.
        if (!primaryFailed) {
          throw cleanupError;
        }
      }
    }
  }

  test.describe('Iterations for fields validation', () => {
    test('Check with name field and description', async ({ page }, testInfo) => {
      test.slow();
      const meaningName = resourceName('test_iterate-description', testInfo);
      await validateAndRemoveMeaning(page, testInfo, meaningName, '', '', '');
    });

    test('Check with name field, description and relation', async ({ page }, testInfo) => {
      test.slow();
      const meaningName = resourceName('test_iterate-relation', testInfo);
      await validateAndRemoveMeaning(page, testInfo, meaningName, 'has relation', '', '');
    });

    test('Check with name field, description, relation and approved', async ({ page }, testInfo) => {
      test.slow();
      const meaningName = resourceName('test_iterate-approved', testInfo);
      await validateAndRemoveMeaning(
        page,
        testInfo,
        meaningName,
        'has relation',
        'has approved',
        '',
      );
    });

    test('Check with name field, description, relation, approved and selectable', async ({ page }, testInfo) => {
      test.slow();
      const meaningName = resourceName('test_iterate-selectable', testInfo);
      await validateAndRemoveMeaning(
        page,
        testInfo,
        meaningName,
        'has relation',
        'has approved',
        'has selectable',
      );
    });
  });

  test('Create, find and delete Meaning', async ({ page }, testInfo) => {
    test.slow();
    const meaningName = resourceName('test_new', testInfo);
    pendingCleanup.add(meaningName);

    await test.step('Create Meaning', async () => {
      await createMeanings(page, meaningName);
    });

    await test.step('Find the new Meaning in the table', async () => {
      await findMeanings(page, meaningName);
    });

    await test.step('Delete the new Meaning and verify absence', async () => {
      await deleteMeanings(page, meaningName);
      pendingCleanup.delete(meaningName);
    });
  });

  test('Create, edit, find and delete Meaning', async ({ page }, testInfo) => {
    test.slow();
    const meaningName = resourceName('test_edit', testInfo);
    pendingCleanup.add(meaningName);

    await test.step('Create Meaning', async () => {
      await createMeanings(page, meaningName);
    });

    await test.step('Find the new Meaning in the table', async () => {
      await findMeanings(page, meaningName);
    });

    await test.step('Edit Meaning', async () => {
      await editMeaning(page, meaningName);
    });

    await test.step('Find the edited Meaning in the table', async () => {
      await findEditedMeanings(page, meaningName);
    });

    await test.step('Delete the edited Meaning and verify absence', async () => {
      await deleteMeanings(page, meaningName);
      pendingCleanup.delete(meaningName);
    });
  });
});
