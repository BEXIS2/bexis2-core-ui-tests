import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';

const { checkEntityTemplate, createEntityTemplate, editEntityTemplate, deleteEntityTemplate, deleteEditedEntityTemplate } = require('./utils/entityTemplateFunctions');


// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Entity Template', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await page.goto(`${host}/dcm/entitytemplates`); // Go to entity template page
  });

  test.afterAll(async () => {
    await page.close(); // Close the page after all tests
  });



  test.describe('Iterations for fields validation', () => {
    const entityName = `test_iterate-${+Date.now()}`;

    test('Check with entity name and entity type', async () => {
      await checkEntityTemplate(page, entityName, "Dataset", "", "", "", "", "")
    });



    test('Check with entity name and Description', async () => {
      await checkEntityTemplate(page, entityName, "", "Test Description", "", "", "", "")
    });

    test('Check with entity name, entity type and Description', async () => {
      await checkEntityTemplate(page, entityName, "Dataset", "Test Description", "", "", "", "")
    });

    test.slow
    test('Check with entity name, entity type, description and Metadata', async () => {
      await checkEntityTemplate(page, entityName, "Dataset", "Test Description", "1", "", "", "")
      await deleteEntityTemplate(page, entityName)
    });

    test.slow
    test('Check with entity name, entity type, description,Metadata and required field', async () => {
      await checkEntityTemplate(page, entityName, "Dataset", "Test Description", "1", "Description", "", "")
      await deleteEntityTemplate(page, entityName)
    });

    test.slow
    test('Check with entity name, entity type, description, Metadata, required field and dataset ', async () => {
      await checkEntityTemplate(page, entityName, "Dataset", "Test Description", "1", "Description", "hasDataSet", "")
      await deleteEntityTemplate(page, entityName)
    });

    test.slow
    test('Check with entity name, entity type, description, Metadata, required field and file type ', async () => {
      await checkEntityTemplate(page, entityName, "Dataset", "Test Description", "1", "Description", "", "hasFileType")
      await deleteEntityTemplate(page, entityName)
    });


  });



  test.describe('Create new entity template', () => {
    const entityName = `test_new-${+Date.now()}`;

    test('Create entity template', async () => {
      await createEntityTemplate(page, entityName);
    });

    test('Delete new entity', async () => {
      await deleteEntityTemplate(page, entityName);
    });

  });

  test.describe('Edit entity template', () => {
    const entityName = `test_edit-${+Date.now()}`;

    test('Create entity template', async () => {
      await createEntityTemplate(page, entityName);
    });



    test('Edit entity template', async () => {
      await editEntityTemplate(page, entityName);
    });


    test('Delete edited entity template', async () => {
      await deleteEditedEntityTemplate(page);
    });
  });
});

