import { expect } from '@playwright/test';
import { searchNamedTable } from './tableAssertions';

const visibleToast = (page, expectedMessage) => page
    .locator('.toast[data-testid="toast"]:visible')
    .filter({ hasText: expectedMessage });

async function waitForVariableFormReady(page) {
    // Unit/data-type changes validate and regroup dependent dropdowns
    // asynchronously. Cancelling during that update can leave the form stuck.
    const form = page.locator('[id^="variable-"][id$="-form"]');
    await expect(form).toBeVisible();
    await expect(form.locator('.icon.loading:visible')).toHaveCount(0, { timeout: 15_000 });
}

async function selectOption(page, inputSelector, optionText) {
    await page.locator(inputSelector).click();
    const option = page.locator('.list-item:visible').getByText(optionText, { exact: true });
    await expect(option).toHaveCount(1);
    await option.click();
    await expect(option).toBeHidden();
    await waitForVariableFormReady(page);
}

async function openVariableForm(page) {
    await page.locator('#create').click();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#save')).toBeVisible();
}

async function cancelVariableForm(page) {
    await waitForVariableFormReady(page);
    const cancelButton = page.locator('#cancel:visible');
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
    await expect(page.locator('#name')).toBeHidden();
    await expect(page.locator('#create')).toBeVisible();
}

async function fillVariableForm(page, variableName, {
    description = 'Test Variable',
    unit,
    dataType,
    meaning,
    constraint,
    approved = false,
} = {}) {
    await page.locator('#name').fill(variableName);
    await page.locator('#description').fill(description);

    if (unit) {
        await selectOption(page, '#unit', unit);
    }
    if (dataType) {
        await selectOption(page, '#dataType', dataType);
    }
    if (meaning) {
        await selectOption(page, '#links', meaning);
    }
    if (constraint) {
        await selectOption(page, '#constraints', constraint);
    }
    if (approved) {
        const approvedSwitch = page.getByRole('switch').filter({ hasText: 'Approved' });
        await expect(approvedSwitch).toHaveAttribute('aria-checked', 'false');
        await approvedSwitch.click();
        await expect(approvedSwitch).toHaveAttribute('aria-checked', 'true');
    }
}

async function saveVariable(page, expectedMessage) {
    const saveButton = page.locator('#save');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    const notification = visibleToast(page, expectedMessage);
    await expect(notification).toHaveCount(1);
    await expect(notification.locator('.text-base')).toHaveText(expectedMessage);
    await notification.getByRole('button').click();
    await expect(notification).toBeHidden();
}

async function searchVariable(page, variableName) {
    const { row } = await searchNamedTable(page, {
        tableId: 'VariableTemplates',
        listPath: '/rpm/VariableTemplate/GetVariableTemplates',
        name: variableName,
    });
    return row;
}

async function checkVariables(page, variableName, options) {
    await openVariableForm(page);
    await fillVariableForm(page, variableName, options);

    const saveButton = page.locator('#save');
    if (!options.canSave) {
        await expect(saveButton).toBeDisabled();
        await cancelVariableForm(page);
        return;
    }

    await saveVariable(page, 'Variable Template created.');
    await expect(page.locator('#create')).toBeVisible();
}

async function createVariable(page, variableName, constraintName) {
    await openVariableForm(page);
    await fillVariableForm(page, variableName, {
        unit: 'none',
        dataType: 'Boolean',
        meaning: 'occurrenceID',
        constraint: constraintName,
        approved: true,
    });
    await saveVariable(page, 'Variable Template created.');
}

async function findVariable(page, variableName, description = 'Test Variable') {
    const row = await searchVariable(page, variableName);
    await expect(row).toHaveCount(1);

    const id = await row.getAttribute('id');
    const index = id.split('-')[2];
    await expect(page.locator(`#VariableTemplates-name-${index}`)).toHaveText(variableName);
    await expect(page.locator(`#VariableTemplates-description-${index}`)).toHaveText(description);
    await expect(page.locator(`#VariableTemplates-dataType-${index}`)).toHaveText('Boolean');
    await expect(page.locator(`#VariableTemplates-unit-${index}`)).toHaveText('none');
}

async function editVariable(page, variableName) {
    const row = await searchVariable(page, variableName);
    await expect(row).toHaveCount(1);
    await row.getByTitle(`Edit Variable Template, ${variableName}`, { exact: true }).click();

    await expect(page.locator('#description')).toBeVisible();
    await page.locator('#description').fill('Test Edit Variable');
    await saveVariable(page, 'Variable Template updated.');
    // Updating keeps the inline edit form open by design. Reload the list so
    // the following persisted-state checks do not operate on the form's
    // background table.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#create')).toBeVisible();
}

async function deleteVariable(page, variableName, allowMissing = false) {
    const row = await searchVariable(page, variableName);

    if (allowMissing && await row.count() === 0) {
        return false;
    }

    await expect(row).toHaveCount(1);
    await row.getByTitle(`Delete Variable Template, ${variableName}`, { exact: true }).click();

    const modal = page
        .locator('[data-testid="modal"]:visible')
        .filter({ hasText: variableName });
    await expect(modal).toHaveCount(1);
    await expect(modal.locator('.modal-header')).toHaveText('Delete Variable Template');
    await expect(modal.locator('.modal-body')).toContainText(variableName);
    await modal.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(modal).toBeHidden();

    const expectedMessage = `Variable Template "${variableName}" deleted.`;
    const notification = visibleToast(page, expectedMessage);
    await expect(notification).toHaveCount(1);
    await expect(notification.locator('.text-base')).toHaveText(expectedMessage);
    await notification.getByRole('button').click();
    await expect(notification).toBeHidden();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#create')).toBeVisible();
    const remainingRow = await searchVariable(page, variableName);
    await expect(remainingRow).toHaveCount(0);
    await expect(page.getByText('No rows available', { exact: true })).toBeVisible();
    return true;
}

async function findEditedVariable(page, variableName) {
    await findVariable(page, variableName, 'Test Edit Variable');
}

async function checkConstraint(page, constraintName) {
    await openVariableForm(page);
    await page.locator('#constraints').click();
    const option = page.locator('.list-item:visible').getByText(constraintName, { exact: true });
    await expect(option).toHaveCount(1);
    await option.click();
    await cancelVariableForm(page);
}

module.exports = {
    checkVariables,
    deleteVariable,
    createVariable,
    findVariable,
    editVariable,
    findEditedVariable,
    checkConstraint,
};
