import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { gotoApp, login } from '../shared';
const { checkAndCloseToast, deleteConstraint } = require('./utils/uniqueFunction');
const { createDomainConstraint } = require('./utils/domainFunctions');

const { checkVariables, createVariable, findVariable, deleteVariable, editVariable, findEditedVariable, checkConstraint } = require('./utils/variableFormFunctions');


test.describe('Variable', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;
  const constraintName = `test-variable-constraint-${+Date.now()}`;
  const variableIterate = `test_iterate-${+Date.now()}`;
  const variableNew = `test_new-${+Date.now()}`;
  const variableEdit = `test_edit-${+Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(90_000);
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await gotoApp(page, '/rpm/constraints/', '#create');
    await createDomainConstraint(page, constraintName);
  });

  test.beforeEach(async () => {
    await gotoApp(page, '/rpm/variabletemplate/', '#create');
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(120_000);
    const cleanupErrors: string[] = [];
    let cleanupPage: Page | undefined;

    try {
      cleanupPage = await browser.newPage();
      await login(cleanupPage);

      for (const variableName of [variableIterate, variableNew, variableEdit]) {
        try {
          await gotoApp(cleanupPage, '/rpm/variabletemplate/', '#create');
          await deleteVariable(cleanupPage, variableName, true);
        } catch (error) {
          cleanupErrors.push(`${variableName}: ${error}`);
        }
      }

      try {
        await gotoApp(cleanupPage, '/rpm/constraints/', '#create');
        if (await deleteConstraint(cleanupPage, constraintName, true, false)) {
          await checkAndCloseToast(cleanupPage, constraintName);
          const constraintRow = cleanupPage.locator('[id^=constraints-row-]').filter({
            has: cleanupPage.getByText(constraintName, { exact: true }),
          });
          await expect(constraintRow).toHaveCount(0);
        }
      } catch (error) {
        cleanupErrors.push(`${constraintName}: ${error}`);
      }
    } catch (error) {
      cleanupErrors.push(`cleanup setup: ${error}`);
    } finally {
      if (cleanupPage && !cleanupPage.isClosed()) {
        await cleanupPage.close();
      }
      if (page && !page.isClosed()) {
        await page.close();
      }
    }

    if (cleanupErrors.length > 0) {
      throw new Error(`Variable cleanup failed:\n${cleanupErrors.join('\n')}`);
    }
  });

  // Unique name for the Variable
  test.slow();
  test.describe('Iterations for fields validation', () => {
    // test('Check title ', async () => {
    //   //Check with title name
    //   await checkTitle(page, 'Variable', '.w-full >> .table.table-compact', 'h1.h1');
    // });
    test('Check Constraint', async () => {
      await checkConstraint(page, constraintName);
    });

    test('Name and description are not sufficient', async () => {
      await checkVariables(page, variableIterate, { canSave: false });
    });

    test('Name, description and unit are not sufficient', async () => {
      await checkVariables(page, variableIterate, { unit: 'none', canSave: false });
    });

    test('Name, description and data type are not sufficient', async () => {
      await checkVariables(page, variableIterate, { dataType: 'Boolean', canSave: false });
    });

    test('Required fields create a variable', async () => {
      await checkVariables(page, variableIterate, { unit: 'none', dataType: 'Boolean', canSave: true });
      await findVariable(page, variableIterate);
      await deleteVariable(page, variableIterate);
    });

    test('Required fields and meaning create a variable', async () => {
      await checkVariables(page, variableIterate, {
        unit: 'none', dataType: 'Boolean', meaning: 'occurrenceID', canSave: true,
      });
      await findVariable(page, variableIterate);
      await deleteVariable(page, variableIterate);
    });

    test('Required fields and constraint create a variable', async () => {
      await checkVariables(page, variableIterate, {
        unit: 'none', dataType: 'Boolean', constraint: constraintName, canSave: true,
      });
      await findVariable(page, variableIterate);
      await deleteVariable(page, variableIterate);
    });

    test('Required fields, meaning and constraint create a variable', async () => {
      await checkVariables(page, variableIterate, {
        unit: 'none', dataType: 'Boolean', meaning: 'occurrenceID', constraint: constraintName, canSave: true,
      });
      await findVariable(page, variableIterate);
      await deleteVariable(page, variableIterate);
    });

    test('All current fields create an approved variable', async () => {
      await checkVariables(page, variableIterate, {
        unit: 'none',
        dataType: 'Boolean',
        meaning: 'occurrenceID',
        constraint: constraintName,
        approved: true,
        canSave: true,
      });
      await findVariable(page, variableIterate);
      await deleteVariable(page, variableIterate);
    });

  });

  test.describe('Create new variable', () => {
    // test('should match the expected title', async () => {
    //   await checkTitle(page, 'Variables', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test('Check Constraint', async () => {
      await checkConstraint(page, constraintName);
    });

    test('Create, find and delete variable lifecycle', async () => {
      await test.step('Create variable', async () => {
        await createVariable(page, variableNew, constraintName);
      });

      await test.step('Find the new variable in the table', async () => {
        await findVariable(page, variableNew);
      });

      await test.step('Delete new variable', async () => {
        await deleteVariable(page, variableNew);
      });
    });

  });

  test.describe('Edit new variable', () => {
    // test('should match the expected title', async () => {
    //   await checkTitle(page, 'Variables', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test('Check Constraint', async () => {
      await checkConstraint(page, constraintName);
    });

    test('Create, find, edit and delete variable lifecycle', async () => {
      test.slow();

      await test.step('Create variable', async () => {
        await createVariable(page, variableEdit, constraintName);
      });

      await test.step('Find the new variable in the table', async () => {
        await findVariable(page, variableEdit);
      });

      await test.step('Edit variable', async () => {
        await editVariable(page, variableEdit);
      });

      await test.step('Find the edited variable in the table', async () => {
        await findEditedVariable(page, variableEdit);
      });

      await test.step('Delete edited variable', async () => {
        await deleteVariable(page, variableEdit);
      });
    });
  });
});
