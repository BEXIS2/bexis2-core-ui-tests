// Navigating to the Constraint Management section of the application.
// Filling in details for creating new constraints.
// Validating the successful creation of constraints or catching error messages.

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login, host } from '../shared';

test.describe.configure({ mode: 'serial' });

test.describe('Constraints', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await login(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('CreateConstraint', () => {
        test('create range constraint', async () => {

            // Click on setting icon
            await page.click('.fa.fa-cog');

            // Click on Manage Constraints
            await page.click('text=Manage Constraints');


            // Clicking on create button
            await page.click('#create');

            // Generate a random 5-digit number
            const randomFiveDigitNumber = Math.floor(10000 + Math.random() * 90000);

            // Click on name field and type test data
            await page.click('#name');
            await page.type('#name', `ummaima${randomFiveDigitNumber}`);



            // Click on description field and type test data
            await page.click('#description');
            await page.type('#description', 'Test');

            // Click on Constraint type
            await page.click('#constraintTypes');


            // Click on the option Range'. 
            await page.selectOption('#constraintTypes', 'Range');

            // Adding lowebound value '1'
            await page.fill('#lowerbound', '1');

            // Adding upperbound value '5'
            await page.fill('#upperbound', '5');


            // Click on save button
            await page.click('#save');

            // await expect(page.locator('div.text-base:has-text("saved")')).toBeVisible();
            // await expect(page.locator('div.text-base:has-text("Name already exist")')).toBeVisible();

            // Wait for the message to appear
            const messageLocator = page.locator('div.text-base');
            await messageLocator.waitFor();

            // Get the text content of the message
            const messageText = await messageLocator.textContent();

            // Check if the message text is one of the expected messages
            if (messageText.includes('saved')) {
                await expect(messageLocator).toHaveText(/saved/);
            } else if (messageText.includes('Name already exist')) {
                await expect(messageLocator).toHaveText(/Name already exist/);
            } else {
                // If none of the expected messages are found, throw an error
                throw new Error('Unexpected message text: ' + messageText);
            }

        });
        test('create domain constraint', async () => {

            // Reload the page
            await page.reload();

            // Clicking on create button
            await page.click('#create');
            // Generate a random 5-digit number
            const randomFiveDigitNumber = Math.floor(10000 + Math.random() * 90000);

            // Click on name field and type test data
            await page.click('#name');
            await page.waitForTimeout(100); // waits for 1000 milliseconds

            await page.type('#name', `ummaima${randomFiveDigitNumber}`);




            // Click on description field and type test data
            await page.click('#description');
            await page.type('#description', 'Test');

            // Click on Constraint type
            await page.click('#constraintTypes');


            // Click on the option Domain'. 
            await page.selectOption('#constraintTypes', 'Domain');
            // Click on the div to focus
            await page.click('div.cm-activeLine.cm-line');

            // Type the text
            await page.keyboard.type('Hello Testing Domain');

            await page.waitForTimeout(2000); // waits for 2000 milliseconds

            // Click on save button
            await page.click('#save');

            // Wait for the message to appear
            const messageLocator = page.locator('div.text-base');
            await messageLocator.waitFor();

            // Get the text content of the message
            const messageText = await messageLocator.textContent();


            // Check if the message text is one of the expected messages
            if (messageText.includes('saved')) {
                await expect(messageLocator).toHaveText(/saved/);
            } else if (messageText.includes('Domain is not define')) {
                await expect(messageLocator).toHaveText(/not/);
            } else {
                // If none of the expected messages are found, throw an error
                throw new Error('Unexpected message text: ' + messageText);
            }

        });
        test('create pattern constraint', async () => {

            // Reload the page
            await page.reload();

            // Clicking on create button
            await page.click('#create');

            // Generate a random 5-digit number
            const randomFiveDigitNumber = Math.floor(10000 + Math.random() * 90000);

            // Click on name field and type test data
            await page.click('#name');
            await page.type('#name', `ummaima${randomFiveDigitNumber}`);


            // Click on description field and type test data
            await page.click('#description');
            await page.type('#description', 'Test');

            // Click on Constraint type
            await page.click('#constraintTypes');


            // Click on the option Domain'. 
            await page.selectOption('#constraintTypes', 'Pattern');
            // Click on the div to focus
            await page.click('div.cm-activeLine.cm-line');

            // Type the text
            await page.keyboard.type('Hello Testing Pattern');

            // Click on example and type test data 
            await page.click('#example');
            await page.type('#example', ' Hello, I am Tester');


            // Click on save button
            await page.click('#save');

            // Wait for the message to appear
            const messageLocator = page.locator('div.text-base');
            await messageLocator.waitFor();

            // Get the text content of the message
            const messageText = await messageLocator.textContent();


            // Check if the message text is one of the expected messages
            if (messageText.includes('saved')) {
                await expect(messageLocator).toHaveText(/saved/);
            } else if (messageText.includes('Domain is not define')) {
                await expect(messageLocator).toHaveText(/not/);
            } else {
                // If none of the expected messages are found, throw an error
                throw new Error('Unexpected message text: ' + messageText);
            }

        });


    });
});
