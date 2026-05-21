import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const host = process.env.HOST || 'https://rc.bexis2.uni-jena.de';

const user = process.env.ACCOUNT_USERNAME;
const password = process.env.ACCOUNT_PASSWORD;

export const login = async (page: Page) => {
	if (!user || !password) {
		throw new Error(
			'Login-Daten fehlen. Bitte ACCOUNT_USERNAME und ACCOUNT_PASSWORD in .env oder GitHub Secrets setzen.'
		);
	}

	await page.goto(`${host}/Account/Login`);
	await page.locator('#UserName').fill(user);
	await page.locator('#Password').fill(password);
	await page.locator('input[type=submit]').click();

	await page.waitForURL(`${host}/ddm/search`);
	await expect(page).toHaveURL(`${host}/ddm/search`);
};