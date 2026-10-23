import { expect } from '@playwright/test';

const createButton = (page) => page.locator('button[title="create"]');
const saveButton = (page) =>
  page.getByRole('button', { name: 'Save Template', exact: true });
const websiteErrorText =
  /\b(?:error|exception|fehler|nre)\b|null\s*reference|object reference not set/i;
const websiteErrorStyle =
  /(?:^|\s)(?:variant-(?:filled|soft)-error|(?:bg|text|border)-error-\d+)(?:\s|$)/i;

function exactText(value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escaped}\\s*$`);
}

function entityTemplateCard(page, entityName) {
  return page.locator('.card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: entityName,
      exact: true,
    }),
  });
}

async function assertNoVisibleWebsiteErrorToast(page) {
  const toasts = await page
    .locator('[data-testid="toast"]:visible')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: (node.innerText || node.textContent || '')
          .trim()
          .replace(/\s+/g, ' '),
        classes: [node, ...node.querySelectorAll('*')]
          .map((element) =>
            typeof element.className === 'string' ? element.className : ''
          )
          .join(' '),
      }))
    );
  const errors = toasts.filter(
    ({ text, classes }) =>
      websiteErrorText.test(text) || websiteErrorStyle.test(classes)
  );

  if (errors.length > 0) {
    throw new Error(
      `Website error toast detected:\n${errors
        .map(({ text }) => text || '(error-styled toast without text)')
        .join('\n')}`
    );
  }
}

async function startWebsiteErrorToastCapture(page) {
  await assertNoVisibleWebsiteErrorToast(page);
  await page.evaluate(() => {
    const captureKey = '__playwrightEntityTemplateWebsiteErrors';
    const observerKey = '__playwrightEntityTemplateWebsiteErrorObserver';
    const errorText =
      /\b(?:error|exception|fehler|nre)\b|null\s*reference|object reference not set/i;
    const errorStyle =
      /(?:^|\s)(?:variant-(?:filled|soft)-error|(?:bg|text|border)-error-\d+)(?:\s|$)/i;

    window[observerKey]?.disconnect();
    window[captureKey] = [];
    const toastStates = new WeakMap();

    const isVisible = (node) => {
      if (!node.isConnected || node.getClientRects().length === 0) return false;
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden';
    };
    const getErrorMessage = (node) => {
      const text = (node.innerText || node.textContent || '')
        .trim()
        .replace(/\s+/g, ' ');
      const classes = [node, ...node.querySelectorAll('*')]
        .map((element) =>
          typeof element.className === 'string' ? element.className : ''
        )
        .join(' ');
      if (!errorText.test(text) && !errorStyle.test(classes)) return null;
      return text || '(error-styled toast without text)';
    };
    const scan = (captureNewlyVisible) => {
      for (const node of document.querySelectorAll('[data-testid="toast"]')) {
        const visible = isVisible(node);
        const errorMessage = getErrorMessage(node);
        const previousState = toastStates.get(node);

        if (
          captureNewlyVisible &&
          visible &&
          errorMessage &&
          (!previousState?.visible || previousState.errorMessage !== errorMessage) &&
          !window[captureKey].includes(errorMessage)
        ) {
          window[captureKey].push(errorMessage);
        }

        toastStates.set(node, { visible, errorMessage });
      }
    };

    // Existing hidden/dismissed toast nodes are only the baseline; a newly
    // visible Error/NRE produced by this save operation is captured.
    scan(false);
    const observer = new MutationObserver(() => scan(true));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    window[observerKey] = observer;
  });
}

async function failOnCapturedWebsiteErrorToasts(page) {
  const errors = await page.evaluate(() => [
    ...(window.__playwrightEntityTemplateWebsiteErrors || []),
  ]);

  if (errors.length > 0) {
    throw new Error(`Website error toast detected:\n${errors.join('\n')}`);
  }
}

async function expectEntityTemplateListReady(page) {
  await expect(createButton(page)).toBeVisible();

  // Built-in templates are always present. Waiting for one proves that the
  // list has rendered, rather than treating an unfinished reload as absence.
  const templateCards = page.locator('.card').filter({
    has: page.getByRole('heading', { level: 2 }),
  });
  await expect(templateCards.first()).toBeVisible();
}

async function expectPersistedEntityTemplateCard(
  page,
  entityName,
  metadataStructure,
  description,
  fileTypes,
  replacedEntityName
) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectEntityTemplateListReady(page);
  await assertNoVisibleWebsiteErrorToast(page);
  await expectEntityTemplateCard(
    page,
    entityName,
    metadataStructure,
    description,
    fileTypes
  );

  if (replacedEntityName !== undefined) {
    await expect(entityTemplateCard(page, replacedEntityName)).toHaveCount(0);
  }
}

async function expectPersistedEntityTemplateAbsence(page, entityName) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectEntityTemplateListReady(page);
  await assertNoVisibleWebsiteErrorToast(page);
  await expect(entityTemplateCard(page, entityName)).toHaveCount(0);
}

async function expectEntityTemplateSaveResult(
  page,
  entityName,
  metadataStructure,
  description,
  fileTypes,
  replacedEntityName
) {
  let optimisticAssertionError;

  try {
    await expectEntityTemplateCard(
      page,
      entityName,
      metadataStructure,
      description,
      fileTypes
    );
    if (replacedEntityName !== undefined) {
      await expect(entityTemplateCard(page, replacedEntityName)).toHaveCount(0);
    }
  } catch (error) {
    optimisticAssertionError = error;
  }

  // Prefer the actual website error over a secondary timeout waiting for the
  // optimistic card, and catch short-lived as well as currently visible NREs.
  await failOnCapturedWebsiteErrorToasts(page);
  await assertNoVisibleWebsiteErrorToast(page);
  if (optimisticAssertionError !== undefined) {
    throw optimisticAssertionError;
  }

  await expectPersistedEntityTemplateCard(
    page,
    entityName,
    metadataStructure,
    description,
    fileTypes,
    replacedEntityName
  );
}

async function openCreateForm(page) {
  await createButton(page).click();
  await expect(page.locator('#entityType')).toBeVisible();
}

async function selectEntityType(page, label) {
  const entityType = page.locator('#entityType');
  await entityType.selectOption({ label });

  // RC currently needs a second change event: selectOption updates the bound
  // value, while this event reruns validation with entityType.text available.
  await entityType.dispatchEvent('change');
}

async function selectMetadataStructure(page, label) {
  const metadataStructure = page.locator('#metadataStructure');
  await metadataStructure.selectOption({ label });
  await metadataStructure.dispatchEvent('change');
}

async function selectMultiOption(page, containerSelector, label) {
  const container = page.locator(containerSelector);
  await container.locator('.svelte-select.multi').click();

  const option = container
    .locator('.list-item .item')
    .filter({ hasText: exactText(label) });
  await expect(option).toHaveCount(1);
  await option.click();
}

async function clearMultiOptions(page, containerSelector, expectedCount) {
  const clearButtons = page.locator(
    `${containerSelector} .multi-item .multi-item-clear`
  );
  await expect(clearButtons).toHaveCount(expectedCount);

  for (let index = 0; index < expectedCount; index += 1) {
    await clearButtons.first().click();
  }

  await expect(clearButtons).toHaveCount(0);
}

async function expectEntityTemplateCard(
  page,
  entityName,
  metadataStructure,
  description,
  fileTypes
) {
  const card = entityTemplateCard(page, entityName);
  await expect(card).toHaveCount(1);
  await expect(card).toBeVisible();
  await expect(
    card.locator('header .badge.variant-filled-surface')
  ).toHaveText(metadataStructure);
  await expect(
    card.locator('header .badge.variant-filled-secondary')
  ).toHaveText('Dataset');

  if (description !== undefined) {
    await expect(card.locator('blockquote')).toHaveText(description);
  }

  if (fileTypes !== undefined) {
    await expect(card.locator('i')).toHaveText(
      `Restricted to these file types: ${fileTypes}`
    );
  }

  return card;
}

async function checkEntityTemplate(
  page,
  hasEntityName,
  hasEntityType,
  hasDescription,
  hasMetaData,
  hasRequiredField,
  hasDataSet,
  hasFileType
) {
  await openCreateForm(page);

  if (hasEntityType) {
    await selectEntityType(page, hasEntityType);
  }

  if (hasEntityName) {
    await page.locator('#name').fill(hasEntityName);
  }

  if (hasDescription) {
    await page.locator('#description').fill(hasDescription);
  }

  if (hasMetaData) {
    await selectMetadataStructure(page, hasMetaData);
  }

  if (hasRequiredField === 'Description') {
    await selectMultiOption(page, '#metadataFields-container', 'Description');
  }

  if (hasDataSet === 'hasDataSet') {
    await selectMultiOption(page, '#disabledHooks-container', 'File Upload');
    await selectMultiOption(page, '#disabledHooks-container', 'Data Structure');
  }

  if (hasFileType === 'hasFileType') {
    await selectMultiOption(page, '#allowedFileTypes-container', '.avi');
    await selectMultiOption(page, '#allowedFileTypes-container', '.bmp');
  }

  const shouldSave = Boolean(
    hasEntityName && hasEntityType && hasDescription && hasMetaData
  );

  if (!shouldSave) {
    await expect(saveButton(page)).toBeDisabled();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(createButton(page)).toBeVisible();
    return;
  }

  await expect(saveButton(page)).toBeEnabled();
  await startWebsiteErrorToastCapture(page);
  await saveButton(page).click();
  await expectEntityTemplateSaveResult(page, hasEntityName, 'Basic ABCD');
}

async function createEntityTemplate(page, entityName) {
  await openCreateForm(page);
  await selectEntityType(page, 'Dataset');
  await page.locator('#name').fill(entityName);
  await page.locator('#description').fill('Test description');
  await selectMetadataStructure(page, 'Basic ABCD');

  await selectMultiOption(page, '#metadataFields-container', 'Description');
  await selectMultiOption(page, '#metadataFields-container', 'ProjectTitle');
  await selectMultiOption(page, '#disabledHooks-container', 'File Upload');
  await selectMultiOption(page, '#disabledHooks-container', 'Data Structure');
  await selectMultiOption(page, '#allowedFileTypes-container', '.avi');
  await selectMultiOption(page, '#allowedFileTypes-container', '.bmp');

  await expect(saveButton(page)).toBeEnabled();
  await startWebsiteErrorToastCapture(page);
  await saveButton(page).click();

  await expectEntityTemplateSaveResult(
    page,
    entityName,
    'Basic ABCD',
    'Test description',
    '.avi, .bmp'
  );
}

async function editEntityTemplate(page, entityName, editedEntityName) {
  const card = entityTemplateCard(page, entityName);
  await expect(card).toHaveCount(1);
  await card.getByRole('button', { name: 'edit', exact: true }).click();

  await expect(page.locator('#name')).toHaveValue(entityName);
  await page.locator('#name').fill(editedEntityName);
  await page.locator('#description').fill('Test description edited');
  await page.locator('#metadataStructure').selectOption({ label: 'GBIF' });

  await clearMultiOptions(page, '#metadataFields-container', 2);
  await selectMultiOption(page, '#metadataFields-container', 'Author');
  await selectMultiOption(page, '#metadataFields-container', 'Title');

  await clearMultiOptions(page, '#disabledHooks-container', 2);
  await selectMultiOption(page, '#disabledHooks-container', 'Metadata');
  await selectMultiOption(page, '#disabledHooks-container', 'Validation');

  await clearMultiOptions(page, '#allowedFileTypes-container', 2);
  await selectMultiOption(page, '#allowedFileTypes-container', '.csv');
  await selectMultiOption(page, '#allowedFileTypes-container', '.dbf');

  await expect(saveButton(page)).toBeEnabled();
  await startWebsiteErrorToastCapture(page);
  await saveButton(page).click();

  await expectEntityTemplateSaveResult(
    page,
    editedEntityName,
    'GBIF',
    'Test description edited',
    '.csv, .dbf',
    entityName
  );
}

async function confirmEntityTemplateDeletion(page) {
  const modal = page.locator('.modal:visible');
  await expect(modal).toHaveCount(1);
  await expect(modal).toBeVisible();
  await expect(modal.locator('.modal-header')).toHaveText('Please Confirm');
  await expect(modal.locator('.modal-body')).toHaveText(
    'Are you sure you wish to remove?'
  );

  const confirmButton = modal.locator('.modal-footer button.variant-filled');
  await expect(confirmButton).toHaveCount(1);
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
  await expect(modal).toBeHidden();
}

async function deleteEntityTemplate(page, entityName) {
  const card = entityTemplateCard(page, entityName);
  await expect(card).toHaveCount(1);
  await card.getByRole('button', { name: 'delete', exact: true }).click();
  await confirmEntityTemplateDeletion(page);
  await expectPersistedEntityTemplateAbsence(page, entityName);
}

async function deleteEntityTemplateIfPresent(page, entityName) {
  await expectEntityTemplateListReady(page);

  const card = entityTemplateCard(page, entityName);
  const count = await card.count();
  if (count === 0) {
    return false;
  }

  await expect(card).toHaveCount(1);
  await card.getByRole('button', { name: 'delete', exact: true }).click();
  await confirmEntityTemplateDeletion(page);
  await expectPersistedEntityTemplateAbsence(page, entityName);
  return true;
}

module.exports = {
  checkEntityTemplate,
  createEntityTemplate,
  editEntityTemplate,
  deleteEntityTemplate,
  deleteEntityTemplateIfPresent,
};
