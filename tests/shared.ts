import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const host = process.env.HOST;

const user = process.env.ACCOUNT_USERNAME as string;
const password = process.env.ACCOUNT_PASSWORD as string;

export const login = async (page: Page) => {
	await page.goto(`${host}/Account/Login`);
	await page.locator('#UserName').fill(user);
	await page.locator('#Password').fill(password);
	await page.locator('input[type=submit]').click();
	await page.waitForURL(`${host}/`); // wait for redirect
	await expect(page.url()).toBe(`${host}/`); // check if login was successful
};