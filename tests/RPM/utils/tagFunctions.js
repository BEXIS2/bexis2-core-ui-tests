import { expect } from '@playwright/test';

const TAG_SETTING_LABELS = {
  useTags: 'Activate tags to summarize versions (key: use_tags)',
  useMinor: 'Use minor tags (key: use_minor)',
  curatorRequired:
    'Manage release tags requires curator (key: curator_required_for_tags)',
};

const TAG_TOAST_CAPTURE_KEY = '__playwrightTagWebsiteErrorToasts';
const TAG_TOAST_OBSERVER_KEY = '__playwrightTagWebsiteErrorToastObserver';
const TAG_TOAST_ERROR_TEXT =
  /\b(?:error|exception|failed|failure|fehler|nre|unable)\b|could not|cannot|can't|null\s*reference|object reference not set/i;
const TAG_TOAST_ERROR_STYLE =
  /(?:^|\s)(?:variant-(?:filled|soft)-error|(?:bg|text|border)-error-\d+)(?:\s|$)/i;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function readTagWebsiteErrorToasts(page) {
  const visibleErrors = await page
    .locator('[data-testid="toast"]:visible')
    .evaluateAll(
      (nodes, { textSource, textFlags, styleSource, styleFlags }) => {
        const textPattern = new RegExp(textSource, textFlags);
        const stylePattern = new RegExp(styleSource, styleFlags);

        return nodes
          .map((node) => {
            const text = (node.innerText || node.textContent || '')
              .trim()
              .replace(/\s+/g, ' ');
            const classes = [node, ...node.querySelectorAll('*')]
              .map((element) =>
                typeof element.className === 'string' ? element.className : ''
              )
              .join(' ');
            return { classes, text };
          })
          .filter(
            ({ classes, text }) =>
              textPattern.test(text) || stylePattern.test(classes)
          )
          .map(({ text }) => text || '(error-styled toast without text)');
      },
      {
        textSource: TAG_TOAST_ERROR_TEXT.source,
        textFlags: TAG_TOAST_ERROR_TEXT.flags,
        styleSource: TAG_TOAST_ERROR_STYLE.source,
        styleFlags: TAG_TOAST_ERROR_STYLE.flags,
      }
    );

  const capturedErrors = await page.evaluate(
    (captureKey) => [...(window[captureKey] || [])],
    TAG_TOAST_CAPTURE_KEY
  );

  return [...new Set([...capturedErrors, ...visibleErrors])];
}

async function failOnTagWebsiteErrorToasts(page) {
  const errors = await readTagWebsiteErrorToasts(page);
  if (errors.length > 0) {
    throw new Error(`Website error toast detected:\n${errors.join('\n')}`);
  }
}

async function startTagToastCapture(page) {
  // Do not reset away an error that is still visible or that was captured for
  // the preceding operation.
  await failOnTagWebsiteErrorToasts(page);

  await page.evaluate(
    ({ captureKey, observerKey, textSource, textFlags, styleSource, styleFlags }) => {
      const textPattern = new RegExp(textSource, textFlags);
      const stylePattern = new RegExp(styleSource, styleFlags);

      window[observerKey]?.disconnect();
      window[captureKey] = [];
      const toastStates = new WeakMap();

      const isVisible = (node) => {
        if (!node.isConnected || node.getClientRects().length === 0) return false;
        const style = window.getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden';
      };
      const errorMessage = (node) => {
        const text = (node.innerText || node.textContent || '')
          .trim()
          .replace(/\s+/g, ' ');
        const classes = [node, ...node.querySelectorAll('*')]
          .map((element) =>
            typeof element.className === 'string' ? element.className : ''
          )
          .join(' ');
        if (!textPattern.test(text) && !stylePattern.test(classes)) return null;
        return text || '(error-styled toast without text)';
      };
      const scan = (captureChanges) => {
        for (const node of document.querySelectorAll('[data-testid="toast"]')) {
          const visible = isVisible(node);
          const message = errorMessage(node);
          const previous = toastStates.get(node);
          const becameVisible = visible && !previous?.visible;
          const becameAnError =
            visible && message && previous?.message !== message;

          if (
            captureChanges &&
            message &&
            (becameVisible || becameAnError) &&
            !window[captureKey].includes(message)
          ) {
            window[captureKey].push(message);
          }
          toastStates.set(node, { message, visible });
        }
      };

      // Existing success/info toasts form the baseline. Existing error toasts
      // were rejected immediately before installing this observer.
      scan(false);
      const observer = new MutationObserver(() => scan(true));
      observer.observe(document.body, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
      window[observerKey] = observer;
    },
    {
      captureKey: TAG_TOAST_CAPTURE_KEY,
      observerKey: TAG_TOAST_OBSERVER_KEY,
      textSource: TAG_TOAST_ERROR_TEXT.source,
      textFlags: TAG_TOAST_ERROR_TEXT.flags,
      styleSource: TAG_TOAST_ERROR_STYLE.source,
      styleFlags: TAG_TOAST_ERROR_STYLE.flags,
    }
  );
}

async function openApplicationSettings(page, host) {
  await page.goto(host);

  const settingsMenu = page.locator('#menu-settings');
  await expect(settingsMenu).toBeVisible();
  await settingsMenu.click();

  const applicationSettings = page.locator('#menu-Application-Settings');
  await expect(applicationSettings).toBeVisible();
  await applicationSettings.click();
}

async function selectDataDiscovery(page) {
  const dataDiscoveryOption = page.locator(
    'div.listbox-item[data-testid="listbox-item"][role="option"]',
    {
      has: page.locator('input[type="radio"][name="medium"][value="ddm"]'),
    }
  );

  await expect(dataDiscoveryOption).toBeVisible();
  await expect(dataDiscoveryOption).toContainText('Data Discovery');
  await dataDiscoveryOption.click();
}

function tagSettingToggle(page, key) {
  return page
    .locator('[data-testid="slide-toggle"]')
    .filter({ hasText: TAG_SETTING_LABELS[key] });
}

async function readToggle(toggle) {
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toHaveAttribute('aria-checked', /^(true|false)$/);
  return (await toggle.getAttribute('aria-checked')) === 'true';
}

async function setToggle(toggle, enabled) {
  if ((await readToggle(toggle)) !== enabled) {
    await toggle.click();
  }

  await expect(toggle).toHaveAttribute('aria-checked', String(enabled));
}

async function readTagSettings(page) {
  return {
    useTags: await readToggle(tagSettingToggle(page, 'useTags')),
    useMinor: await readToggle(tagSettingToggle(page, 'useMinor')),
    curatorRequired: await readToggle(tagSettingToggle(page, 'curatorRequired')),
  };
}

async function saveTagSettings(page) {
  const saveButton = page.locator(
    'button.variant-filled-primary[type="submit"]'
  );
  await expect(saveButton).toHaveCount(1);
  await expect(saveButton).toBeEnabled();

  const pageOrigin = new URL(page.url()).origin;
  const saveResponse = page.waitForResponse(
    (response) =>
      response.request().method() !== 'GET' &&
      new URL(response.url()).origin === pageOrigin
  );

  await saveButton.click();
  const response = await saveResponse;
  expect(response.status(), `Settings save failed: ${response.url()}`).toBeLessThan(
    400
  );
}

async function openTagSettings(page, host) {
  await openApplicationSettings(page, host);
  await selectDataDiscovery(page);
}

async function applyTagSettings(page, host, settings) {
  await openTagSettings(page, host);

  await setToggle(tagSettingToggle(page, 'useTags'), settings.useTags);
  await setToggle(tagSettingToggle(page, 'useMinor'), settings.useMinor);
  await setToggle(
    tagSettingToggle(page, 'curatorRequired'),
    settings.curatorRequired
  );

  await saveTagSettings(page);

  // Re-open the persisted settings instead of trusting only the client state.
  await openTagSettings(page, host);
  await expect(tagSettingToggle(page, 'useTags')).toHaveAttribute(
    'aria-checked',
    String(settings.useTags)
  );
  await expect(tagSettingToggle(page, 'useMinor')).toHaveAttribute(
    'aria-checked',
    String(settings.useMinor)
  );
  await expect(tagSettingToggle(page, 'curatorRequired')).toHaveAttribute(
    'aria-checked',
    String(settings.curatorRequired)
  );
}

async function setAriaSwitch(toggle, enabled) {
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-checked', /^(true|false)$/);

  if (((await toggle.getAttribute('aria-checked')) === 'true') !== enabled) {
    await toggle.click();
  }

  await expect(toggle).toHaveAttribute('aria-checked', String(enabled));
}

async function expectLatestToast(page, text) {
  const exactMessage = new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`);
  const toast = page.locator('[data-testid="toast"]:visible').filter({
    has: page.locator('.text-base').filter({ hasText: exactMessage }),
  });

  try {
    await expect.poll(async () => {
      if ((await readTagWebsiteErrorToasts(page)).length > 0) return 'error';
      const count = await toast.count();
      if (count > 1) return 'duplicate-success';
      return count === 1 ? 'success' : 'waiting';
    }, {
      message: `No unique success toast appeared for "${text}"`,
      timeout: 10_000,
    }).toBe('success');
  } catch (error) {
    // Prefer the actual website error over a secondary "success missing"
    // timeout when both describe the same operation.
    await failOnTagWebsiteErrorToasts(page);
    throw error;
  }

  await expect(toast).toHaveCount(1);
  await expect(toast.locator('.text-base')).toHaveText(text);
  await failOnTagWebsiteErrorToasts(page);
}

module.exports = {
  applyTagSettings,
  expectLatestToast,
  openTagSettings,
  readTagSettings,
  setAriaSwitch,
  startTagToastCapture,
};
