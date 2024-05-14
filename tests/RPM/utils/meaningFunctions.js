import { expect } from "@playwright/test";


async function checkMeanings(page, meaningName, hasDescription, hasRelation, hasApproved, hasSelectable, hasConstraints) {
    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);

    // Fill in the name and description if provided
    if (meaningName) {
        await page.locator('input[id=name]').fill(meaningName);
    }
    if (hasDescription) {
        await page.locator('textarea[id=description]').fill('Test Meanings');
    }
    if (hasRelation) {
        // Click the button
        await page.click('div.inline-block.align-bottom button.chip.variant-filled-primary');

        // Click the input element
        await page.click('div#relation-container');
        await page.waitForTimeout(500);
        await page.locator('.list-item .item.first').click();

        // Click the input element
        await page.click('div#others-container');
        await page.waitForTimeout(500);
        const objects = await page.waitForSelector('.list-item .item:text("occurrenceID")', { visible: true, enabled: true });
        await objects.click()

    }

    if (hasApproved) {
        // Click on the element based on its text content
        await page.click('div.slide-toggle-text:has-text("Approved")');
    }
    if (hasSelectable) {
        // Click on the element based on its text content
        await page.click('div.slide-toggle-text:has-text("Selectable")');
    }

    if (hasConstraints) {
        // Select Constraint
        await page.locator('#constraints').click();
        await page.waitForTimeout(500);
        const option = await page.waitForSelector('.list-item .item:text("Test Constraint")', { visible: true, enabled: true });
        await option.click()

    }

    // Handling different conditions based on parameters
    if (meaningName && hasDescription && !hasRelation && !hasApproved && !hasSelectable && !hasConstraints) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Meaning created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }

    else if (meaningName && hasDescription && hasRelation && !hasApproved && !hasSelectable && !hasConstraints) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Meaning created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }

    else if (meaningName && hasDescription && hasRelation && hasApproved && !hasSelectable && !hasConstraints) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Meaning created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }

    else if (meaningName && hasDescription && hasRelation && hasApproved && hasSelectable && !hasConstraints) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForTimeout(500);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Meaning created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }

    else if (meaningName && hasDescription && hasRelation && !hasApproved && !hasSelectable && hasConstraints) {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        // Check if the save button is enable and reload the page
        const saveButton = page.locator('button#save').click();
        await page.waitForTimeout(1000);

        await page.waitForSelector('.toast[data-testid=toast] .text-base');
        const toast = await page.locator('.toast[data-testid=toast]');

        let expectedMessage = 'Meaning created.';
        await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
        await toast.locator('button').click(); // Close the toast
        await page.reload();
    }
}

async function findMeanings(page, meaningName) {
    //  await page.reload()
    await page.waitForLoadState('load');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Search for the variable
    await page.locator('#Meaning-search').fill(meaningName);
    // Wait for 1000 milliseconds
    await page.waitForTimeout(1000);
    // Click on the Search button
    await page.click('form.flex > button:nth-child(2)');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Locate the correct row
    const row = page.locator('[id^=Meaning-row-]');
    await expect(row).toHaveCount(1);
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    // Get the index of the row
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check values for the row
    await expect(page.locator(`#Meaning-name-${index}`)).toHaveText(meaningName);
    await expect(page.locator(`#Meaning-description-${index}`)).toHaveText(
        'Test Meanings'
    );
}

async function deleteMeanings(page) {
    // Click on the delete button
    await page.locator('[id^=delete-]').click();

    // Wait until the modal appears
    await page.waitForSelector('.modal');

    // Check the modal title and body text
    await expect(page.locator('.modal-header')).toHaveText('Delete Meaning');
    await expect(page.locator('.modal-body')).toContainText(`Are you sure you wish to delete Meaning`);

    // Click the confirm button in the modal footer
    await page.locator('.modal-footer button.variant-filled').click();
    // Wait for 750 milliseconds
    await page.waitForTimeout(750);
    await page.reload()

}

async function createMeanings(page, meaningName) {
    await page.waitForLoadState('load');

    await page.locator('#create').click();
    await page.waitForTimeout(1000);

    // Fill in the name and description if provided
    await page.locator('input[id=name]').fill(meaningName);
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    await page.locator('textarea[id=description]').fill('Test Meanings');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // Click the button
    await page.click('div.inline-block.align-bottom button.chip.variant-filled-primary');
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);

    // Click the input element
    await page.click('div#relation-container');

    await page.waitForTimeout(500);
    await page.locator('.list-item .item.first').click();

    // Click the input element
    await page.click('div#others-container');
    await page.waitForTimeout(500);

    const objects = await page.waitForSelector('.list-item .item:text("occurrenceID")', { visible: true, enabled: true });
    await objects.click()

    // Click on the element based on its text content
    await page.click('div.slide-toggle-text:has-text("Approved")');
    await page.waitForTimeout(500);

    // Click on the element based on its text content
    await page.click('div.slide-toggle-text:has-text("Selectable")');
    await page.waitForTimeout(500);

    // Check if the save button is enable and reload the page
    const saveButton = page.locator('button#save').click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('.toast[data-testid=toast] .text-base');
    const toast = await page.locator('.toast[data-testid=toast]');

    let expectedMessage = 'Meaning created.';
    await expect(await toast.locator('.text-base')).toHaveText(expectedMessage);
    await toast.locator('button').click(); // Close the toast
    await page.reload();
}

async function editMeaning(page, meaning) {

    // Click on the delete button
    await page.locator('[id^=edit-]').click();
    // Wait for 500 milliseconds
    await page.waitForTimeout(500);
    await page.locator('input[id=name]').fill(meaning);

    // Click on the element based on its text content
    await page.click('div.slide-toggle-text:has-text("Approved")');
    await page.waitForTimeout(500);

    // Click on the element based on its text content
    await page.click('div.slide-toggle-text:has-text("Selectable")');
    await page.waitForTimeout(500);
    await page.locator('button[id=save]').click();

    // Wait until the toast appears
    await page.waitForSelector('.toast[data-testid=toast] .text-base');

    // Check the toast message
    const toast = await page.locator('.toast[data-testid=toast]');
    await expect(await toast.locator('.text-base')).toHaveText(
        `Meaning updated.`
    );
    await toast.locator('button').click(); // Close the toast
}

async function findEditedMeanings(page, meaning) {

    //   Search for the new Meaning
    await page.locator('#Meaning-search').fill(meaning);
    // Locate the correct row
    const row = page.locator('[id^=Meaning-row-]');
    await expect(row).toHaveCount(1);
    // Get the index of the row
    const id = (await row.getAttribute('id'));
    const index = id.split('-')[2];
    // Check values for the row
    await expect(page.locator(`#Meaning-name-${index}`)).toHaveText(meaning);
    await expect(page.locator(`#Meaning-description-${index}`)).toHaveText(
        'Test Meanings'
    );

}

module.exports = {
    checkMeanings,
    findMeanings,
    deleteMeanings,
    createMeanings,
    editMeaning,
    findEditedMeanings
};
