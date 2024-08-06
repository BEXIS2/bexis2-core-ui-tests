import { expect } from "@playwright/test";

async function checkVariables(page, variableName, hasDescription, hasUnit, hasDataType, hasMissingValueName, hasMissingValueDes, hasMeanings, hasConstraints, hasApproved) {
    await page.waitForLoadState('load');
    await page.locator('#create').click();
    await page.waitForLoadState('load');
    await page.waitForTimeout(4000);
    await page.locator('#create').click();
    await page.waitForTimeout(250);

    // Fill in the name and description if provided
    if (variableName) {
        await page.waitForTimeout(250);
        await page.locator('input[id=name]').fill(variableName);
    }
    if (hasDescription) {
        await page.waitForTimeout(250);
        await page.locator('textarea[id=description]').fill('Test Variable');
    }

    if (hasUnit) {
        await page.waitForTimeout(250);
        // Select Unit
        await page.locator('#unit').click();
        await page.waitForTimeout(250);
        const option = await page.waitForSelector('.list-item .item:text("none")', { visible: true, enabled: true });
        await option.click()
    }
    if (hasDataType) {
        await page.waitForTimeout(250);
        // Select Data Types
        await page.locator('#dataType').click();
        await page.waitForTimeout(250);
        // Locate and click on the dropdown option with text 'none'
        const option = await page.waitForSelector('.list-item .item:text("bool")', { visible: true, enabled: true });
        await option.click();
    }
    if (hasMissingValueName) {
        await page.waitForTimeout(250);
        await page.locator('input[id=missing-value-name]').fill('Test Missing Value');
    }
    if (hasMissingValueDes) {
        await page.locator('input[id=missing-value-description]').fill('Test Missing value Des.');
    }
    if (hasMeanings) {
        // Select Meanings
        await page.locator('#links').click();
        await page.waitForTimeout(500);
        await page.locator('.list-item .item.first').click();

    }
    if (hasConstraints) {
        // Select Constraint
        await page.locator('#constraints').click();
        await page.waitForTimeout(500);
        const option = await page.waitForSelector('.list-item .item:text("Test Constraint")', { visible: true, enabled: true });
        await option.click()

    }
    if (hasApproved) {
        // Click the toggle button
        await page.locator('.slide-toggle-track').click();
    }

    // Handling different conditions based on parameters
    if (variableName && hasDescription && !hasUnit && !hasDataType && !hasMissingValueName && !hasMissingValueDes && !hasMeanings && !hasConstraints && !hasApproved) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload()
    }
    else if (variableName && hasDescription && hasUnit && !hasDataType && !hasMissingValueName && !hasMissingValueDes && !hasMeanings && !hasConstraints && !hasApproved) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();
    }
    else if (variableName && hasDescription && !hasUnit && hasDataType && !hasMissingValueName && !hasMissingValueDes && !hasMeanings && !hasConstraints && !hasApproved) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is disabled and reload the page
        const saveButton = page.locator('button#save');
        await expect(saveButton).toBeDisabled();
        await page.reload();
    }
    else if (variableName && hasDescription && hasUnit && hasDataType && hasMissingValueName && !hasMissingValueDes && !hasMeanings && !hasConstraints && !hasApproved) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Variable Template created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();

    }
    else if (variableName && hasDescription && hasUnit && hasDataType && hasMissingValueName && hasMissingValueDes && !hasMeanings && !hasConstraints && !hasApproved) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Variable Template created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }
    else if (variableName && hasDescription && hasUnit && hasDataType && hasMissingValueName && hasMissingValueDes && hasMeanings && !hasConstraints && !hasApproved) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Variable Template created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }
    else if (variableName && hasDescription && hasUnit && hasDataType && hasMissingValueName && hasMissingValueDes && hasMeanings && hasConstraints && !hasApproved) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Variable Template created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }
    else if (variableName && hasDescription && hasUnit && hasDataType && !hasMissingValueName && !hasMissingValueDes && hasMeanings && hasConstraints && hasApproved) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Variable Template created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }
}
async function createVariable(page, variableName) {

    await page.waitForLoadState('load');
    await page.locator('#create').click();
    await page.waitForLoadState('load');
    await page.waitForTimeout(4250);
    await page.locator('#create').click();
    await page.waitForTimeout(350);

    // Adding name 
    await page.waitForTimeout(250);
    await page.locator('input[id=name]').fill(variableName);

    // Adding description   
    await page.waitForTimeout(250);
    await page.locator('textarea[id=description]').fill('Test Variable');

    // Adding Unit
    await page.waitForTimeout(250);
    await page.locator('#unit').click();
    await page.waitForTimeout(250);
    const unit = await page.waitForSelector('.list-item .item:text("none")', { visible: true, enabled: true });
    await unit.click()

    //Adding datatype
    await page.waitForTimeout(250);
    await page.locator('#dataType').click();
    await page.waitForTimeout(250);

    // Locate and click on the dropdown option with text 'none'
    const datatype = await page.waitForSelector('.list-item .item:text("bool")', { visible: true, enabled: true });
    await datatype.click();

    // Adding missing value name
    await page.waitForTimeout(250);
    await page.locator('input[id=missing-value-name]').fill('Test Missing Value');

    // Adding missing value description
    await page.locator('input[id=missing-value-description]').fill('Test Missing value Des.');

    // Adding Meanings
    await page.locator('#links').click();
    await page.waitForTimeout(500);
    await page.locator('.list-item .item.first').click();

    // Adding constraint
    await page.locator('#constraints').click();
    await page.waitForTimeout(500);
    const option = await page.waitForSelector('.list-item .item:text("Test Constraint")', { visible: true, enabled: true });
    await option.click()

    // Click the toggle button
    await page.locator('.slide-toggle-track').click();

    // Check if the save button is enable and reload the page
    const saveButton = page.locator('button#save').click();
    await page.waitForTimeout(500);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'Variable Template created.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();
}

async function findVariable(page, variable) {
    //  await page.reload()
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Search for the variable
    await page.locator('#VariableTemplates-search').fill(variable);
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Click on the Search button
    await page.click('form.flex > button:nth-child(2)');
    // Locate the correct row
    const row = page.locator('[id^=VariableTemplates-row-]');
    await expect(row).toHaveCount(1);
    // Get the index of the row
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check values for the row
    await expect(page.locator(`#VariableTemplates-name-${index}`)).toHaveText(variable);
    await expect(page.locator(`#VariableTemplates-description-${index}`)).toHaveText(
        'Test Variable'
    );
}

async function editVariable(page) {

    await page.locator('[id^=edit-]').click(); // Click on the edit button
    // Edit description   
    await page.waitForTimeout(1000);
    await page.locator('textarea[id=description]').fill('Test Edit Variable');

    // Adding missing value name
    await page.waitForTimeout(250)
    await page.locator('input[id=missing-value-name]').fill('Test Missing Value Edited');

    // Adding missing value description
    await page.locator('input[id=missing-value-description]').fill('Edit Test Missing value Des.');
    await page.waitForTimeout(1500);

    // Check if the save button is enable and reload the page
    const saveButton = page.locator('button#save').click();
    await page.waitForTimeout(500);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'Variable Template updated.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();

}

async function deleteVariable(page) {

    // Click on the delete button
    await page.locator('[id^=delete-]').click();

    // Wait until the modal appears
    await page.waitForSelector('.modal');

    // Check the modal title and body text
    await expect(page.locator('.modal-header')).toHaveText('Delete Variable Template');
    await expect(page.locator('.modal-body')).toHaveText(`Are you sure you wish to delete variable template ""?`);

    // Click the confirm button in the modal footer
    await page.locator('.modal-footer button.variant-filled').click();
    // Wait for 750 milliseconds
    await page.waitForTimeout(750);
    await page.reload()

}

async function findEditedVariable(page, variable) {
    //  await page.reload()
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Search for the variable
    await page.locator('#VariableTemplates-search').fill(variable);
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Click on the Search button
    await page.click('form.flex > button:nth-child(2)');
    // Locate the correct row
    const row = page.locator('[id^=VariableTemplates-row-]');
    await expect(row).toHaveCount(1);
    // Get the index of the row
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check values for the row
    await expect(page.locator(`#VariableTemplates-name-${index}`)).toHaveText(variable);
    await expect(page.locator(`#VariableTemplates-description-${index}`)).toHaveText(
        'Test Edit Variable'
    );
}

async function checkConstraint(page) {
    await page.waitForLoadState('load');
    await page.locator('#create').click();
    await page.waitForLoadState('load');
    await page.waitForTimeout(4250);
    await page.locator('#create').click();
    await page.waitForTimeout(300);
    
    try {
        // Click on the dropdown
        await page.locator('#constraints').click();
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

async function navVariableManage(page) {

    // Click on the div element
    await page.click('div.hidden:nth-child(4)');
    await page.waitForSelector('text="Manage Variable Templates"', { visible: true });

    // Click on the div element
    await page.click('text="Manage Variable Templates"');
}



module.exports = {
    checkVariables,
    deleteVariable,
    createVariable,
    findVariable,
    editVariable,
    findEditedVariable,
    navVariableManage,
    checkConstraint

};

