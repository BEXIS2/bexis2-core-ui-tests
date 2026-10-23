import { expect } from '@playwright/test';

const websiteErrorToastTextPattern =
    /\b(?:error|exception|failed|failure|fehler|nre|unable)\b|could not|cannot|can't|null\s*reference|object reference not set/i;
const websiteErrorToastStylePattern =
    /(?:^|\s)(?:variant-(?:filled|soft)-error|(?:bg|text|border)-error-\d+)(?:\s|$)/i;

export async function assertNoVisibleWebsiteErrorToasts(page, expectedMessage) {
    const errors = await page.locator('.toast[data-testid="toast"]:visible').evaluateAll(
        (toasts, { textSource, textFlags, styleSource, styleFlags, expectedMessage }) => {
            const textPattern = new RegExp(textSource, textFlags);
            const stylePattern = new RegExp(styleSource, styleFlags);

            return toasts
                .map((toast) => ({
                    text: (toast.querySelector('.text-base')?.textContent || toast.textContent || '').trim().replace(/\s+/g, ' '),
                    classes: [toast, ...toast.querySelectorAll('*')]
                        .map((element) => typeof element.className === 'string' ? element.className : '')
                        .join(' '),
                }))
                .filter(({ text, classes }) => text !== expectedMessage && (textPattern.test(text) || stylePattern.test(classes)));
        },
        {
            expectedMessage,
            textSource: websiteErrorToastTextPattern.source,
            textFlags: websiteErrorToastTextPattern.flags,
            styleSource: websiteErrorToastStylePattern.source,
            styleFlags: websiteErrorToastStylePattern.flags,
        }
    );

    if (errors.length > 0) {
        throw new Error(
            'Website error toast detected:\n' + errors.map(({ text }) => text).join('\n')
        );
    }
}

export async function expectAndDismissToast(page, expectedMessage) {
    const toast = page.locator('.toast[data-testid="toast"]:visible').filter({
        has: page.getByText(expectedMessage, { exact: true }),
    });
    await assertNoVisibleWebsiteErrorToasts(page, expectedMessage);
    await expect(toast).toHaveCount(1, { timeout: 20_000 });
    await expect(toast.locator('.text-base')).toHaveText(expectedMessage);
    // A matching success message must not hide an accompanying application error.
    await assertNoVisibleWebsiteErrorToasts(page, expectedMessage);
    await toast.getByRole('button').click();
    await expect(toast).toBeHidden();
}
