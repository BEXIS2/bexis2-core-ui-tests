import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// export const host = process.env.HOST;
export const host = "https://rc.bexis2.uni-jena.de";

// const user = process.env.ACCOUNT_USERNAME as string;
// const password = process.env.ACCOUNT_PASSWORD as string;
const user = "admin";
const password = "123456";

export const login = async (page: Page) => {
	await page.goto(`${host}/Account/Login`);
	await page.locator('#UserName').fill(user);
	await page.locator('#Password').fill(password);
	await page.locator('input[type=submit]').click();
	await page.waitForURL(`${host}/ddm/search`); // wait for redirect Felix: Addded /ddm/search
	await expect(page.url()).toBe(`${host}/ddm/search`); // check if login was successful
};