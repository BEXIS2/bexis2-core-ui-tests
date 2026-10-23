import { test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

import { gotoApp, login } from '../shared';

const {
  checkEntityTemplate,
  createEntityTemplate,
  editEntityTemplate,
  deleteEntityTemplateIfPresent,
} = require('./utils/entityTemplateFunctions');

test.describe('Entity Template', () => {
  let page: Page;
  let appReady = false;

  const runId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const names = {
    invalid: `et-invalid-${runId}`,
    metadata: `et-meta-${runId}`,
    requiredField: `et-required-${runId}`,
    dataset: `et-dataset-${runId}`,
    fileType: `et-file-${runId}`,
    created: `et-new-${runId}`,
    editSource: `et-edit-${runId}`,
    edited: `et-edited-${runId}`,
  };

  const cleanupCandidates = [
    names.metadata,
    names.requiredField,
    names.dataset,
    names.fileType,
    names.created,
    names.edited,
    names.editSource,
  ];

  async function cleanupTemplates(targetPage: Page, entityNames: string[]) {
    const errors: string[] = [];

    for (const entityName of new Set(entityNames)) {
      try {
        // Re-entering the list makes cleanup independent from the form/modal
        // state in which a failed assertion left the page.
        await gotoApp(targetPage, '/dcm/entitytemplates', 'button[title=create]');
        await deleteEntityTemplateIfPresent(targetPage, entityName);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${entityName}: ${message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Entity-template cleanup failed:\n${errors.join('\n')}`);
    }
  }

  async function recordPerTestCleanupError(
    testInfo: TestInfo,
    cleanupError: unknown
  ) {
    const message =
      cleanupError instanceof Error
        ? cleanupError.stack ?? cleanupError.message
        : String(cleanupError);

    testInfo.annotations.push({
      type: 'cleanup-error',
      description: message,
    });

    try {
      await testInfo.attach('entity-template-cleanup-error', {
        body: message,
        contentType: 'text/plain',
      });
    } catch (attachmentError) {
      const attachmentMessage =
        attachmentError instanceof Error
          ? attachmentError.message
          : String(attachmentError);
      testInfo.annotations.push({
        type: 'cleanup-attachment-error',
        description: attachmentMessage,
      });
    }
  }

  async function runWithPerTestCleanup(
    testInfo: TestInfo,
    entityNames: string[],
    action: () => Promise<void>
  ) {
    let primaryFailed = false;

    try {
      await action();
    } catch (error) {
      primaryFailed = true;
      throw error;
    } finally {
      try {
        await cleanupTemplates(page, entityNames);
      } catch (cleanupError) {
        await recordPerTestCleanupError(testInfo, cleanupError);

        // Preserve the original website/assertion failure. If the test body
        // succeeded, the cleanup failure remains a real test failure.
        if (!primaryFailed) {
          throw cleanupError;
        }
      }
    }
  }

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page);
    appReady = true;
  });

  test.beforeEach(async () => {
    await gotoApp(page, '/dcm/entitytemplates', 'button[title=create]');
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(120_000);
    let cleanupPage: Page | undefined;

    try {
      if (appReady) {
        cleanupPage = await browser.newPage();
        await login(cleanupPage);
        await cleanupTemplates(cleanupPage, cleanupCandidates);
      }
    } finally {
      if (cleanupPage && !cleanupPage.isClosed()) await cleanupPage.close();
      if (page && !page.isClosed()) await page.close();
    }
  });

  test.describe('Iterations for fields validation', () => {
    test('Check with entity name and entity type', async () => {
      await checkEntityTemplate(
        page,
        names.invalid,
        'Dataset',
        '',
        '',
        '',
        '',
        ''
      );
    });

    test('Check with entity name and Description', async () => {
      await checkEntityTemplate(
        page,
        names.invalid,
        '',
        'Test Description',
        '',
        '',
        '',
        ''
      );
    });

    test('Check with entity name, entity type and Description', async () => {
      await checkEntityTemplate(
        page,
        names.invalid,
        'Dataset',
        'Test Description',
        '',
        '',
        '',
        ''
      );
    });

    test('Check with entity name, entity type, description and Metadata', async () => {
      test.slow();
      await runWithPerTestCleanup(test.info(), [names.metadata], async () => {
        await checkEntityTemplate(
          page,
          names.metadata,
          'Dataset',
          'Test Description',
          'Basic ABCD',
          '',
          '',
          ''
        );
      });
    });

    test('Check with entity name, entity type, description, Metadata and required field', async () => {
      test.slow();
      await runWithPerTestCleanup(test.info(), [names.requiredField], async () => {
        await checkEntityTemplate(
          page,
          names.requiredField,
          'Dataset',
          'Test Description',
          'Basic ABCD',
          'Description',
          '',
          ''
        );
      });
    });

    test('Check with entity name, entity type, description, Metadata, required field and dataset', async () => {
      test.slow();
      await runWithPerTestCleanup(test.info(), [names.dataset], async () => {
        await checkEntityTemplate(
          page,
          names.dataset,
          'Dataset',
          'Test Description',
          'Basic ABCD',
          'Description',
          'hasDataSet',
          ''
        );
      });
    });

    test('Check with entity name, entity type, description, Metadata, required field and file type', async () => {
      test.slow();
      await runWithPerTestCleanup(test.info(), [names.fileType], async () => {
        await checkEntityTemplate(
          page,
          names.fileType,
          'Dataset',
          'Test Description',
          'Basic ABCD',
          'Description',
          '',
          'hasFileType'
        );
      });
    });
  });

  test.describe('Create new entity template', () => {
    test('Create and delete entity template', async () => {
      test.slow();
      await runWithPerTestCleanup(test.info(), [names.created], async () => {
        await createEntityTemplate(page, names.created);
      });
    });
  });

  test.describe('Edit entity template', () => {
    test('Create, edit and delete entity template', async () => {
      test.slow();
      await runWithPerTestCleanup(
        test.info(),
        [names.edited, names.editSource],
        async () => {
          await createEntityTemplate(page, names.editSource);
          await editEntityTemplate(page, names.editSource, names.edited);
        }
      );
    });
  });
});
