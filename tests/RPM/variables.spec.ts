import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';
const { checkTitle } = require('./utils/uniqueFunction');

const { checkVariables, createVariable, findVariable, deleteVariable, editVariable, findEditedVariable, checkConstraint, navVariableManage } = require('./utils/variableFunctions');


// Annotate entire file as serial.
test.describe.configure({ mode: 'serial' });

test.describe('Variable', () => {
  // Declare page outside of the test hooks so it's accessible by all tests.
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage(); // Create new page
    await login(page); // Login
    await page.goto(`${host}/rpm/variabletemplate/`); // Go to variable page
  });

  test.afterAll(async () => {
    await page.close(); // Close the page after all tests
  });

  // Unique name for the Variable
  test.slow();
  test.describe('Iterations for fields validation', () => {
    const variableIterate = `test_iterate-${+Date.now()}`;
    // test('Check title ', async () => {
    //   //Check with title name
    //   await checkTitle(page, 'Variable', '.w-full >> .table.table-compact', 'h1.h1');
    // });
    test('Check Constraint', async () => {
      await checkConstraint(page);
      await navVariableManage(page);
    });

    test('Check with name field , description', async () => {
      await checkVariables(page, variableIterate, "Test Variable")
    });

    test('Check with name field , description and unit', async () => {
      await checkVariables(page, variableIterate, "Test Variable", "none")
    });

    test('Check with name field , description and, data type', async () => {
      await checkVariables(page, variableIterate, "Test Variable", "", "bool",)
    });

    test('Check with name field , description, data type, unit and missing value ', async () => {
      await checkVariables(page, variableIterate, "Test Variable", "none", "bool", "Test Missing Name", "", "", "", "")
      await findVariable(page, variableIterate)
      test.slow();
      await deleteVariable(page)
    });

    test.slow();
    test('Check with name field , description, data type, unit, missing value  and missing value description ', async () => {
      await checkVariables(page, variableIterate, "Test Variable", "none", "bool", "Test Missing Name", "Test missing value des", "", "", "")
      await findVariable(page, variableIterate)
      test.slow();
      await deleteVariable(page)
    });

    test.slow();
    test('Check with name field , description, data type, unit, missing value , missing value description and meanings ', async () => {

      await checkVariables(page, variableIterate, "Test Variable", "none", "bool", "Test Missing Name", "Test missing value des", "occurrenceID", "", "")
      await findVariable(page, variableIterate)
      test.slow();
      await deleteVariable(page)
    });

    test.slow();
    test('Check with name field , description, data type, unit, missing value , missing value description, meanings and constraint ', async () => {
      await checkVariables(page, variableIterate, "Test Variable", "none", "bool", "Test Missing Name", "Test missing value des", "occurrenceID", "Test Constraint", "")
      await findVariable(page, variableIterate)
      test.slow();
      await deleteVariable(page)
    });

    test.slow();
    test('Check with name field , description, data type, unit, meanings and constraint and approved ', async () => {
      await checkVariables(page, variableIterate, "Test Variable", "none", "bool", "", "", "occurrenceID", "Test Constraint", "Approved")
      await findVariable(page, variableIterate)
      test.slow();
      await deleteVariable(page)
    });

  });

  test.describe('Create new variable', () => {
    const variable = `test_new-${+Date.now()}`;
    // test('should match the expected title', async () => {
    //   await checkTitle(page, 'Variables', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test('Check Constraint', async () => {
      await checkConstraint(page);
      await navVariableManage(page);
    });

    test('Create variable', async () => {
      await createVariable(page, variable);
    });

    test('Find the new variable in the table', async () => {
      await findVariable(page, variable)
    });

    test('Delete new variable', async () => {
      await deleteVariable(page);
    });

  });

  test.describe('Edit new variable', () => {
    const variable = `test_edit-${+Date.now()}`;
    // test('should match the expected title', async () => {
    //   await checkTitle(page, 'Variables', '.w-full >> .table.table-compact', 'h1.h1');
    // });

    test('Check Constraint', async () => {
      await checkConstraint(page);
      await navVariableManage(page);
    });

    test('Create variable', async () => {
      await createVariable(page, variable);
    });

    test('Find the new variable in the table', async () => {
      await findVariable(page, variable)
    });

    test('Edit variable', async () => {
      test.slow();
      await editVariable(page, variable);
    });

    test('Find the edited variable in the table', async () => {
      await findEditedVariable(page, variable)
    });
    test('Delete edited variable', async () => {
      await deleteVariable(page);
    });
  });
});

