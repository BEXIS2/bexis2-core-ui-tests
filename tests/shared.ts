import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const host = process.env.HOST || 'https://rc.bexis2.uni-jena.de';

const user = process.env.ACCOUNT_USERNAME;
const password = process.env.ACCOUNT_PASSWORD;

const isRetryableNavigationTransportError = (error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);

	// Keep retries limited to failures raised by the document navigation itself.
	// Selector timeouts, HTTP responses, redirects and rendered application errors
	// are website outcomes and must remain visible as test failures.
	if (!/page\.goto:/i.test(message)) return false;

	return (
		/Timeout \d+ms exceeded/i.test(message) ||
		/net::ERR_(?:CONNECTION_RESET|CONNECTION_CLOSED|NETWORK_CHANGED|TIMED_OUT)/i.test(
			message
		)
	);
};

export const gotoApp = async (page: Page, path: string, readySelector: string) => {
	const base = host.replace(/\/$/, '');
	const url = /^https?:\/\//.test(path)
		? path
		: `${base}/${path.replace(/^\//, '')}`;
	const expectedUrl = new URL(url);
	const normalizePath = (pathname: string) =>
		(pathname.replace(/\/+$/, '') || '/').toLowerCase();
	let lastError: unknown;

	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			// The RC occasionally keeps non-critical resources loading for a long time.
			// A committed navigation plus a page-specific ready control is the reliable
			// signal that the application itself can be exercised.
			const response = await page.goto(url, { waitUntil: 'commit', timeout: 15_000 });
			if (!response) {
				throw new Error(`Navigation to ${url} returned no document response`);
			}
			if (!response.ok()) {
				throw new Error(`Navigation to ${url} returned HTTP ${response.status()}`);
			}

			const ready = page.locator(`${readySelector}:visible`);
			await ready.first().waitFor({ state: 'visible', timeout: 20_000 });

			const finalUrl = new URL(page.url());
			if (
				finalUrl.origin !== expectedUrl.origin ||
				normalizePath(finalUrl.pathname) !== normalizePath(expectedUrl.pathname)
			) {
				throw new Error(
					`Navigation to ${url} ended on unexpected route ${finalUrl.toString()}`
				);
			}

			const readyCount = await ready.count();
			if (readyCount !== 1) {
				throw new Error(
					`Expected one visible ready control (${readySelector}) on ${finalUrl.pathname}, found ${readyCount}`
				);
			}

			const visibleText = await page.locator('body').innerText();
			if (/Internal Server Error|NullReferenceException|Object reference not set|An unhandled exception has occurred/i.test(visibleText)) {
				throw new Error(`Fatal application error rendered at ${finalUrl.toString()}`);
			}
			return;
		} catch (error) {
			lastError = error;
			if (attempt === 0 && isRetryableNavigationTransportError(error)) {
				continue;
			}
			break;
		}
	}

	const message = lastError instanceof Error ? lastError.message : String(lastError);
	throw new Error(`App page did not become ready at ${url}: ${message}`);
};

export const login = async (page: Page) => {
	if (!user || !password) {
		throw new Error(
			'Login-Daten fehlen. Bitte ACCOUNT_USERNAME und ACCOUNT_PASSWORD in .env oder GitHub Secrets setzen.'
		);
	}

	await gotoApp(page, '/Account/Login', '#UserName');
	await page.locator('#UserName').fill(user);
	await page.locator('#Password').fill(password);
	const searchUrl = `${host.replace(/\/$/, '')}/ddm/search`;
	await Promise.all([
		page.waitForURL(searchUrl, { waitUntil: 'commit', timeout: 20_000 }),
		page.locator('input[type=submit]').click({ noWaitAfter: true }),
	]);
	await expect(page).toHaveURL(searchUrl);
};
