import { expect } from "@playwright/test";

async function checkEntityTemplate(page, hasEntityName, hasEntityType, hasDescription, hasMetaData, hasRequiredField, hasDataSet, hasFileType) {

  // Open the form
  await page.locator('button[title=create]').click();
  // Wait for the requests to finish
  await page.waitForLoadState('domcontentloaded');

  if (hasEntityName) {
    await page.waitForTimeout(250);
    // Fill in the entity name
    await page.locator('#name').fill(hasEntityName);
  }

  if (hasEntityType) {
    await page.waitForTimeout(250);
    await page.locator('#entityType').selectOption('1');
  }

  if (hasDescription) {
    await page.waitForTimeout(250);
    // Fill in the description
    await page.locator('#description').fill(hasDescription);
  }

  if (hasMetaData) {
    await page.waitForTimeout(250);
    // Choose the metadata structure
    await page.locator('#metadataStructure').selectOption(hasMetaData);
    await page.locator('#metadataStructure').dispatchEvent('change');
  }

  if (hasRequiredField == "Description") {
    // Choose required fields
    await page.waitForTimeout(500);
    await page.locator('#metadataFields-container .svelte-select.multi').click();
    await page.waitForTimeout(250);
    await page.locator('#metadataFields-container .list-item .item:has-text("Description")').click();
  }

  if (hasDataSet == "hasDataSet") {
    await page.waitForTimeout(250);
    // Choose dataset components to be disabled
    await page.locator('#disabledHooks-container .svelte-select.multi').click();
    await page.locator('#disabledHooks-container .list-item .item:has-text("File Upload")').click();
    
    await page.locator('#disabledHooks-container .svelte-select.multi').click();
    await page.locator('#disabledHooks-container .list-item .item:has-text("Data Structure")').click();
  }

  if (hasFileType == "hasFileType") {
    await page.waitForTimeout(250);
    // Choose allowed file types for file upload
    await page.locator('#allowedFileTypes-container .svelte-select.multi').click();
    await page.locator('#allowedFileTypes-container .list-item .item:has-text(".avi")').click();

    await page.locator('#allowedFileTypes-container .svelte-select.multi').click();
    await page.locator('#allowedFileTypes-container .list-item .item:has-text(".bmp")').click();
  }
  

  // Handling different conditions based on parameters
  if (hasEntityName && hasEntityType && !hasDescription && !hasMetaData && !hasRequiredField && !hasDataSet && !hasFileType) {

    const saveButton = page.locator('button[title=save]')
    await expect(saveButton).toBeDisabled();
    await page.reload()
  }

  else if (hasEntityName && !hasEntityType && hasDescription && !hasMetaData && !hasRequiredField && !hasDataSet && !hasFileType) {

    const saveButton = page.locator('button[title=save]')
    await expect(saveButton).toBeDisabled();
    await page.reload()
  }

  else if (hasEntityName && hasEntityType && hasDescription && !hasMetaData && !hasRequiredField && !hasDataSet && !hasFileType) {

    const saveButton = page.locator('button[title=save]')
    await expect(saveButton).toBeDisabled();
    await page.reload()
  }
  else if (hasEntityName && hasEntityType && hasDescription && hasMetaData && !hasRequiredField && !hasDataSet && !hasFileType) {

   // Click save
  await page.locator('button[title=save]').click();

  // Verify entity's existence and contents
  const card = await page.locator('.card', {
    has: page.locator(`header h2:has-text("${hasEntityName}")`),
  });
  await expect(
    card.locator('header .badge.variant-filled-surface')
  ).toHaveText('Basic ABCD');
  await expect(
    card.locator('header .badge.variant-filled-secondary')
  ).toHaveText('Dataset');

    await page.reload()
  }

  else if (hasEntityName && hasEntityType && hasDescription && hasMetaData && hasRequiredField && !hasDataSet && !hasFileType) {

    // Click save
   await page.locator('button[title=save]').click();
 
   // Verify entity's existence and contents
   const card = await page.locator('.card', {
     has: page.locator(`header h2:has-text("${hasEntityName}")`),
   });
   await expect(
     card.locator('header .badge.variant-filled-surface')
   ).toHaveText('Basic ABCD');
   await expect(
     card.locator('header .badge.variant-filled-secondary')
   ).toHaveText('Dataset');
 
     await page.reload()
   }

   else if (hasEntityName && hasEntityType && hasDescription && hasMetaData && hasRequiredField && hasDataSet && !hasFileType) {

    // Click save
   await page.locator('button[title=save]').click();
 
   // Verify entity's existence and contents
   const card = await page.locator('.card', {
     has: page.locator(`header h2:has-text("${hasEntityName}")`),
   });
   await expect(
     card.locator('header .badge.variant-filled-surface')
   ).toHaveText('Basic ABCD');
   await expect(
     card.locator('header .badge.variant-filled-secondary')
   ).toHaveText('Dataset');
 
     await page.reload()
   }

   else if (hasEntityName && hasEntityType && hasDescription && hasMetaData && hasRequiredField && !hasDataSet && hasFileType) {

    // Click save
   await page.locator('button[title=save]').click();
 
   // Verify entity's existence and contents
   const card = await page.locator('.card', {
     has: page.locator(`header h2:has-text("${hasEntityName}")`),
   });
   await expect(
     card.locator('header .badge.variant-filled-surface')
   ).toHaveText('Basic ABCD');
   await expect(
     card.locator('header .badge.variant-filled-secondary')
   ).toHaveText('Dataset');
 
     await page.reload()
   }

  
}
async function createEntityTemplate(page, entityName) {

  // Open the form
  await page.locator('button[title=create]').click();
  // Fill in the name
  await page.locator('#name').fill(entityName);
  await page.waitForTimeout(250);
  // Choose the entity type
  await page.locator('#entityType').selectOption('1');
  await page.waitForTimeout(250);
  // Fill in the description
  await page.locator('#description').fill('Test description');
  // Wait for the requests to finish
  await page.waitForLoadState('domcontentloaded');

  // Choose the metadata structure
  await page.waitForTimeout(250);
  await page.locator('#metadataStructure').selectOption('1');
  await page.locator('#metadataStructure').dispatchEvent('change');

  // Choose required fields
await page.waitForTimeout(500);
await page.locator('#metadataFields-container .svelte-select.multi').click();
await page.waitForTimeout(250);
await page.locator('#metadataFields-container .list-item .item:has-text("Description")').click();
await page.locator('#metadataFields-container .svelte-select.multi').click();
await page.locator('#metadataFields-container .list-item .item:has-text("ProjectTitle")').click();

// Choose dataset components to be disabled
await page.waitForTimeout(250);
await page.locator('#disabledHooks-container .svelte-select.multi').click();
await page.locator('#disabledHooks-container .list-item .item:has-text("File Upload")').click();
await page.locator('#disabledHooks-container .svelte-select.multi').click();
await page.locator('#disabledHooks-container .list-item .item:has-text("Data Structure")').click();

// Choose allowed file types for file upload
await page.waitForTimeout(250);
await page.locator('#allowedFileTypes-container .svelte-select.multi').click();
await page.locator('#allowedFileTypes-container .list-item .item:has-text(".avi")').click();
await page.locator('#allowedFileTypes-container .svelte-select.multi').click();
await page.locator('#allowedFileTypes-container .list-item .item:has-text(".bmp")').click();


  // Click save
  await page.locator('button[title=save]').click();

  // Verify entity's existence and contents
  const card = await page.locator('.card', {
    has: page.locator(`header h2:has-text("${entityName}")`),
  });
  await expect(
    card.locator('header .badge.variant-filled-surface')
  ).toHaveText('Basic ABCD');
  await expect(
    card.locator('header .badge.variant-filled-secondary')
  ).toHaveText('Dataset');
  await expect(card.locator('blockquote')).toHaveText('Test description');
  await expect(card.locator('i')).toHaveText(
    'Restricted to these file types: .avi, .bmp'
  );

}


async function editEntityTemplate(page, entityName) {

  const card = await page.locator('.card', {
    has: page.locator(`header h2:has-text("${entityName}")`),
  });

  // Click edit
  await card.locator('button[title=edit]').click();
  await page.waitForTimeout(250);

  // Change the name
  await page.locator('#name').fill('Test Edited');

  // Change the description
  await page.waitForTimeout(250);
  await page.locator('#description').fill('Test description edited');

  // Choose the metadata structure
  await page.waitForTimeout(250);
  await page.locator('#metadataStructure').selectOption('2');

  // Clear the required fields
  await page.waitForTimeout(250);
await expect(page.locator('#metadataFields-container .multi-item .multi-item-clear')).toHaveCount(2);
await page.locator('#metadataFields-container .multi-item .multi-item-clear').first().click();
await page.locator('#metadataFields-container .multi-item .multi-item-clear').click();

// Choose required fields
await page.waitForTimeout(500);
await page.locator('#metadataFields-container .svelte-select.multi').click();
await page.waitForTimeout(250);
await page.locator('#metadataFields-container .list-item .item:has-text("Author")').click();
await page.locator('#metadataFields-container .svelte-select.multi').click();
await page.locator('#metadataFields-container .list-item .item:text-is("Title")').click();

// Clear the dataset components to be disabled
await page.waitForTimeout(250);
await expect(page.locator('#disabledHooks-container .multi-item .multi-item-clear')).toHaveCount(2);
await page.locator('#disabledHooks-container .multi-item .multi-item-clear').first().click();
await page.locator('#disabledHooks-container .multi-item .multi-item-clear').click();

// Choose dataset components to be disabled
await page.waitForTimeout(250);
await page.locator('#disabledHooks-container .svelte-select.multi').click();
await page.locator('#disabledHooks-container .list-item .item:has-text("Metadata")').click();
await page.locator('#disabledHooks-container .svelte-select.multi').click();
await page.locator('#disabledHooks-container .list-item .item:has-text("Validation")').click();

// Clear the allowed file types for file upload
await page.waitForTimeout(250);
await expect(page.locator('#allowedFileTypes-container .multi-item .multi-item-clear')).toHaveCount(2);
await page.locator('#allowedFileTypes-container .multi-item .multi-item-clear').first().click();
await page.locator('#allowedFileTypes-container .multi-item .multi-item-clear').click();

// Choose allowed file types for file upload
await page.waitForTimeout(250);
await page.locator('#allowedFileTypes-container .svelte-select.multi').click();
await page.locator('#allowedFileTypes-container .list-item .item:has-text(".csv")').click();
await page.locator('#allowedFileTypes-container .svelte-select.multi').click();
await page.locator('#allowedFileTypes-container .list-item .item:has-text(".dbf")').click();



  // Click save
  await page.locator('button[title=save]').click();

  // Verify entity's existence and contents
  const editedCard = await page.locator('.card', {
    has: page.locator('header h2:has-text("Test edited")'),
  });
  await expect(
    editedCard.locator('header .badge.variant-filled-surface')
  ).toHaveText('GBIF');
  await expect(
    editedCard.locator('header .badge.variant-filled-secondary')
  ).toHaveText('Dataset');
  await expect(editedCard.locator('blockquote')).toHaveText(
    'Test description edited'
  );
  await expect(editedCard.locator('i')).toHaveText(
    'Restricted to these file types: .csv, .dbf'
  );

}

async function deleteEntityTemplate(page, entityName) {

  const card = await page.locator('.card', {
    has: page.locator(`header h2:has-text("${entityName}")`),
  });

  // Click delete
  await card.locator('button[title=delete]').click();

  // Wait until the modal appears
  await page.waitForSelector('.modal');

  // Check the modal title
  await expect(page.locator('.modal-header')).toHaveText('Please Confirm');
  await expect(page.locator('.modal-body')).toHaveText(
    'Are you sure you wish to remove?'
  );

  // Click Confirm
  await page
    .locator('.modal-footer')
    .locator('button.variant-filled')
    .click();

  // Verify the entity template is deleted
  await expect(card).not.toBeVisible();

}


async function deleteEditedEntityTemplate(page) {

  const card = await page.locator('.card', {
    has: page.locator('header h2:has-text("Test edited")'),
  });

  // Click delete
  await card.locator('button[title=delete]').click();

  // Wait until the modal appears
  await page.waitForSelector('.modal');

  // Check the modal title
  await expect(page.locator('.modal-header')).toHaveText('Please Confirm');
  await expect(page.locator('.modal-body')).toHaveText(
    'Are you sure you wish to remove?'
  );

  // Click Confirm
  await page
    .locator('.modal-footer')
    .locator('button.variant-filled')
    .click();

  // Verify the entity template is deleted
  await expect(card).not.toBeVisible();

}

module.exports = {
  checkEntityTemplate,
  deleteEntityTemplate,
  createEntityTemplate,
  editEntityTemplate,
  deleteEditedEntityTemplate,
 };

