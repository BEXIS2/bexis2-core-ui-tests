import { expect } from "@playwright/test";


async function checkDataStructure(page, hasTitle, hasDescription, hasPrimaryKey, hasOptionalValue, hasName, hasTitleDescription, hasDataType, hasUnit) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Click on the create button
    await page.locator('#create').click();
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Click on green create button
    await page.click('button.btn.variant-filled-primary.grow');
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    await page.click('button[title="add"]');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);


    if (hasTitle) {
        // Fill in the title input
        await page.locator('input[id=title]').fill(hasTitle);
    }
    if (hasDescription) {
        // Fill in the title description input
        await page.locator('textarea.textarea.variant-form-material.input-success').fill('Test data structure');
    }
    if (hasPrimaryKey) {
        // Click on make a part of primary key 
        await page.click('text=Mark as part of primary key');
    }

    if (hasOptionalValue) {
        // Click on optional value
        await page.click('text=Value can be optional');
    }

    if (hasName) {
        // Fill in the name input
        await page.locator('input[id=name-0]').fill(hasName);
    }

    if (hasTitleDescription) {
        // Fill in the title description textarea
        await page.locator('textarea.textarea.variant-form-material.input-error').fill('Test data structure');
    }

    if (hasDataType) {
        // Click the on data type dropdown
        await page.click('div.value-container.svelte-u3g5ju > input.svelte-u3g5ju');
        await page.waitForTimeout(500);
        const dataType = await page.waitForSelector('.list-item .item:text("bool")', { visible: true, enabled: true });
        await dataType.click()
    }

    if (hasUnit) {
        // Click the on unit dropdown
        await page.click('input[id=unit-0]');
        await page.waitForTimeout(500);
        const unit = await page.waitForSelector('.list-item .item:text("none")', { visible: true, enabled: true });
        await unit.click()
        await page.waitForTimeout(500);
    }

    // Handling different conditions based on parameters
    if (hasTitle && hasDescription && !hasPrimaryKey && !hasOptionalValue && !hasName && !hasTitleDescription && !hasDataType && !hasUnit) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();

    }

    if (hasTitle && hasDescription && hasPrimaryKey && !hasOptionalValue && !hasName && !hasTitleDescription && !hasDataType && !hasUnit) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();

    }
    else if (hasTitle && hasDescription && !hasPrimaryKey && hasOptionalValue && !hasName && !hasTitleDescription && !hasDataType && !hasUnit) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();

    }
    else if (hasTitle && hasDescription && hasPrimaryKey && !hasOptionalValue && hasName && hasTitleDescription && !hasDataType && !hasUnit) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();

    }
    else if (hasTitle && hasDescription && !hasPrimaryKey && hasOptionalValue && hasName && hasTitleDescription && !hasDataType && !hasUnit) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();

    }

    else if (hasTitle && hasDescription && hasPrimaryKey && hasOptionalValue && hasName && hasTitleDescription && hasDataType && !hasUnit) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();

    }
    else if (hasTitle && hasDescription && hasPrimaryKey && hasOptionalValue && hasName && hasTitleDescription && !hasDataType && hasUnit) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();

    }
}

async function createDataStructure(page, titleName) {

    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Click on the create button
    await page.locator('#create').click();
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Click on green create button
    await page.click('button.btn.variant-filled-primary.grow');
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // Fill in the title input
    await page.locator('input[id=title]').fill(titleName);

    // Fill in the title description textarea
    await page.locator('textarea[id=description]').fill('Test data structure');

    await page.click('button[title="add"]');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // Click on make a part of primary key 
    await page.click('text=Mark as part of primary key');

    // Fill in the name input
    await page.locator('input[id=name-0]').fill(titleName);

    // Fill in the description textarea
    await page.locator('textarea.textarea.variant-form-material.input-error').fill('Test data structure');

    // Click the on data type dropdown
    await page.click('div.value-container.svelte-u3g5ju > input.svelte-u3g5ju');
    await page.waitForTimeout(500);
    const dataType = await page.waitForSelector('.list-item .item:text("bool")', { visible: true, enabled: true });
    await dataType.click()

    // Click the on unit dropdown
    await page.click('input[id=unit-0]');
    await page.waitForTimeout(500);
    const unit = await page.waitForSelector('.list-item .item:text("none")', { visible: true, enabled: true });
    await unit.click()
    await page.waitForTimeout(500);

    // Click on the dropdown
    await page.locator('input[id=constraints-0]').click();
    await page.waitForTimeout(500);
    const constraint = await page.waitForSelector('.list-item .item:text("Test Constraint")', { visible: true, timeout: 500 });
    await constraint.click();

    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // marking the Primary key
    const firstToggleInput = page.locator('.slide-toggle .slide-toggle-label > .slide-toggle-track').nth(0);
    await firstToggleInput.click(); // Click the first matching element

    // Click on save button
    await page.click('#save');
}

async function findDataStructure(page, dataStructure) {
    // Search for the data structure
    await page.locator('#datastructure-search').fill(dataStructure);

    // Click on the Search button
    await page.click('#datastructure-searchSubmit');

    // Get the row
    const row = page.locator('[id^=datastructure-row-]');
    await expect(row).toHaveCount(1);

    // Get the index of the data structure
    const id = await row.getAttribute('id');
    const index = id.split('-')[2];

    // Check the values
    await expect(page.locator(`#datastructure-title-${index}`)).toHaveText(dataStructure);
    await expect(page.locator(`#datastructure-description-${index}`)).toHaveText(
        'Test data structure'
    );
}

async function deleteDataStructure(page) {
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    await page.locator('[id^=delete-]').click();

    // Wait until the modal appears
    await page.waitForSelector('.modal');

    // Check the modal title and body text
    await expect(page.locator('.modal-header')).toContainText('Delete Structure');
    await expect(page.locator('.modal-body')).toContainText(`Are you sure you wish to delete structure`);

    // Click the confirm button in the modal footer
    await page.locator('.modal-footer button.variant-filled').click();
    await page.waitForLoadState('load');

}
async function checkAndCloseToast(page) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toContainText(`Structure`);

    // Close the toast
    await toast.locator('button').click();
}

async function checkConstraint(page) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Click on the create button
    await page.locator('#create').click();
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Click on green create button
    await page.click('button.btn.variant-filled-primary.grow');
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    await page.click('button[title="add"]');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    try {
        // Click on the dropdown
        await page.locator('input[id=constraints-0]').click();
        await page.waitForTimeout(500);

        let option;
        try {
            // Check if the "TestConstraint" exists
            await page.waitForSelector('.list-item .item:text("Test Constraint")', { visible: true, timeout: 500 });
            

        } catch (error) {
          
            // Perform actions if the element is not found
            // Click on the SVG element
            await page.waitForSelector('div.hidden:nth-child(4)', { visible: true });

            // Click on the div element
            await page.click('div.hidden:nth-child(4)');
            await page.waitForSelector('text="Manage Constraints"', { visible: true });

            // Click on the div element
            await page.click('text="Manage Constraints"');
            await page.waitForLoadState('load');
            await page.waitForTimeout(1000);
            await page.locator('#create').click();
            await page.waitForTimeout(1000);
            await page.locator('input[id=name]').fill("Test Constraint");
            await page.locator('textarea[id=description]').fill('Test constraint');
            await page.selectOption('#constraintTypes', 'Domain');
            await page.click('div.cm-activeLine.cm-line');
            await page.waitForTimeout(1000);
            await page.keyboard.type('Hello Testing Domain');
            await page.waitForTimeout(1000);
            await page.click('#save');
            await page.waitForSelector('.toast[data-testid=toast] .text-base');
            const toast = await page.locator('.toast[data-testid=toast]');
            await expect(await toast.locator('.text-base')).toHaveText(`Constraint "Test Constraint" saved.`);
            await toast.locator('button').click();
            console.log("Element 'Test Constraint' is added.");
        }

    } catch (error) {
        console.log("An error occurred:", error);
    }
}

async function navDataStructure(page) {

    // Click on the div element
    await page.click('div.hidden:nth-child(4)');
    await page.waitForSelector('text="Manage Data Structures"', { visible: true });

    // Click on the div element
    await page.click('text="Manage Data Structures"');
}


async function editDataStructure(page) {

    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    await page.locator('[id^=edit-]').click();
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);


    // Fill in the title description textarea
    await page.locator('textarea[id=description]').fill('Edited test data structure');

    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // Click on make a part of primary key 
    await page.click('text=Value can be optional');

    // Click the on data type dropdown
    await page.click('div.value-container.svelte-u3g5ju > input.svelte-u3g5ju');
    await page.waitForTimeout(500);
    const dataType = await page.waitForSelector('.list-item .item:text("number")', { visible: true, enabled: true });
    await dataType.click()

    // Click the on unit dropdown
    await page.click('input[id=unit-0]');
    await page.waitForTimeout(500);
    const unit = await page.waitForSelector('.list-item .item:text("none")', { visible: true, enabled: true });
    await unit.click()
    await page.waitForTimeout(500);

    // Click on save button
    await page.locator('button[title="save"]').click();

}

async function findEditedDataStructure(page, dataStructure) {
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Search for the data structure
    await page.locator('#datastructure-search').fill(dataStructure);

    // Click on the Search button
    await page.click('#datastructure-searchSubmit');

    // Get the row
    const row = page.locator('[id^=datastructure-row-]');
    await expect(row).toHaveCount(1);

    // Get the index of the data structure
    const id = await row.getAttribute('id');
    const index = id.split('-')[2];

    // Check the values
    await expect(page.locator(`#datastructure-title-${index}`)).toHaveText(dataStructure);
    await expect(page.locator(`#datastructure-description-${index}`)).toHaveText(
        'Edited test data structure'
    );
}


module.exports = {

    createDataStructure,
    findDataStructure,
    deleteDataStructure,
    checkAndCloseToast,
    checkConstraint,
    navDataStructure,
    editDataStructure,
    findEditedDataStructure,
    checkDataStructure

};