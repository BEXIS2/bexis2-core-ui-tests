import { test, expect } from '@playwright/test';
import type { Locator, Page, Response } from '@playwright/test';

import { login, host } from '../shared';

const {
  applyTagSettings,
  expectLatestToast,
  openTagSettings,
  readTagSettings,
  setAriaSwitch,
  startTagToastCapture,
} = require('./utils/tagFunctions');

type TagSettings = {
  useTags: boolean;
  useMinor: boolean;
  curatorRequired: boolean;
};

type TagCase = {
  caseNumber: number;
  version: 'major' | 'minor';
  showNote: boolean;
  publish: boolean;
};

type DatasetLookupState =
  | { kind: 'found'; id: string; title: string }
  | { kind: 'absent'; title: string };

const REQUIRED_TAG_SETTINGS: TagSettings = {
  useTags: true,
  useMinor: true,
  curatorRequired: false,
};

const TAG_CASES: TagCase[] = [
  { caseNumber: 1, version: 'major', showNote: true, publish: false },
  { caseNumber: 2, version: 'major', showNote: true, publish: true },
  { caseNumber: 3, version: 'major', showNote: false, publish: true },
  { caseNumber: 4, version: 'minor', showNote: true, publish: false },
  { caseNumber: 5, version: 'minor', showNote: true, publish: true },
  { caseNumber: 6, version: 'minor', showNote: false, publish: true },
];

test.describe('Tags / Application Settings and Tag Info', () => {
  test.describe.configure({ timeout: 90_000 });

  let page: Page;
  let originalTagSettings: TagSettings | undefined;

  const datasetIds = new Set<string>();
  const purgedDatasetIds = new Set<string>();
  const datasetTitles = new Map<string, string>();
  const pendingDatasetTitles = new Set<string>();
  const runId = `tags-${Date.now().toString(36)}-${process.pid}`;
  const hostOrigin = new URL(host).origin;
  const datasetAdminPath = '/sam/datasets/index/datasets';
  const datasetAdminUrl = new URL(datasetAdminPath, host).toString();

  const settingsMatch = (left: TagSettings, right: TagSettings) =>
    left.useTags === right.useTags &&
    left.useMinor === right.useMinor &&
    left.curatorRequired === right.curatorRequired;

  const normalizePath = (path: string) =>
    path.replace(/\/+$/, '').toLowerCase() || '/';

  const formatError = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const assertResponse = (
    response: Response,
    expectedPath: string,
    context: string
  ) => {
    const responseUrl = new URL(response.url());
    expect(responseUrl.origin, `${context} changed origin`).toBe(hostOrigin);
    expect(normalizePath(responseUrl.pathname), `${context} changed path`).toBe(
      normalizePath(expectedPath)
    );
    expect(
      response.status(),
      `${context} failed: ${response.status()} ${response.statusText()}`
    ).toBeLessThan(400);
  };

  const assertNoWebsiteError = async (
    currentPage: Page,
    context: string
  ) => {
    const body = currentPage.locator('body');
    await expect(body, `${context} has no visible document body`).toBeVisible();
    const bodyText = (await body.innerText()).replace(/\s+/g, ' ');
    const fatalText = bodyText.match(
      /Server Error in ['"][^'"]*['"] Application|Runtime Error|NullReferenceException|Object reference not set|An unhandled exception occurred|An error occurred while processing your request/i
    );
    if (fatalText) {
      throw new Error(`${context} rendered a website error: ${fatalText[0]}`);
    }

    const errorHeading = currentPage.getByRole('heading', {
      name: /^(?:Error|Internal Server Error|Something went wrong)$/i,
    });
    if (await errorHeading.count() > 0) {
      throw new Error(
        `${context} rendered an error heading: ${await errorHeading.first().innerText()}`
      );
    }

    const validationSummary = currentPage.locator(
      '.validation-summary-errors:visible'
    );
    if (await validationSummary.count() > 0) {
      throw new Error(
        `${context} rendered a validation error: ${(
          await validationSummary.first().innerText()
        ).replace(/\s+/g, ' ')}`
      );
    }

    const errorToasts = await currentPage
      .locator('[data-testid="toast"]:visible')
      .evaluateAll((nodes) =>
        nodes
          .map((node) => ({
            text: (node.textContent || '').trim().replace(/\s+/g, ' '),
            classes: [node, ...node.querySelectorAll('*')]
              .map((element) =>
                typeof element.className === 'string' ? element.className : ''
              )
              .join(' '),
          }))
          .filter(
            ({ text, classes }) =>
              /\b(?:error|exception|fehler|nre)\b|null\s*reference|object reference not set/i.test(
                text
              ) ||
              /(?:^|\s)(?:variant-(?:filled|soft)-error|(?:bg|text|border)-error-\d+)(?:\s|$)/i.test(
                classes
              )
          )
      );
    if (errorToasts.length > 0) {
      throw new Error(
        `${context} rendered an error toast: ${errorToasts
          .map(({ text }) => text)
          .join(' | ')}`
      );
    }
  };

  const openDatasetAdmin = async (adminPage: Page) => {
    const response = await adminPage.goto(datasetAdminUrl, {
      waitUntil: 'domcontentloaded',
    });
    expect(response, 'Dataset admin navigation returned no response').toBeTruthy();
    assertResponse(response!, datasetAdminPath, 'Dataset admin navigation');

    const currentUrl = new URL(adminPage.url());
    expect(currentUrl.origin, 'Dataset admin final URL changed origin').toBe(
      hostOrigin
    );
    expect(
      normalizePath(currentUrl.pathname),
      'Dataset admin final URL changed path'
    ).toBe(normalizePath(datasetAdminPath));
    await assertNoWebsiteError(adminPage, 'Dataset admin');

    const table = adminPage.locator('#dataset_table');
    await expect(table, 'Dataset admin list did not become visible').toBeVisible({
      timeout: 20_000,
    });
    await expect(table.locator('thead th').nth(0)).toHaveText('ID');
    await expect(table.locator('thead th').nth(1)).toHaveText('Title');
    await expect(table.locator('thead th').last()).toHaveText('Actions');

    const search = adminPage.locator(
      '#dataset_table_filter input[type="search"]'
    );
    await expect(
      search,
      'Dataset admin full-table search did not initialize'
    ).toBeVisible({ timeout: 20_000 });

    return { search, table };
  };

  const filterDatasetAdmin = async (
    adminPage: Page,
    search: Locator,
    table: Locator,
    value: string
  ) => {
    await search.fill(value);
    await search.press('Enter');
    await expect(search).toHaveValue(value);

    const visibleRows = table.locator('tbody tr[id]:visible');
    const emptyResult = table.locator(
      'tbody td.dataTables_empty:visible, tbody td.dt-empty:visible'
    );
    await expect.poll(async () => {
      const appliedSearch = await search.evaluate((input) => {
        const tableId = input.getAttribute('aria-controls');
        const jquery = (globalThis as any).jQuery;
        if (
          !tableId ||
          !jquery?.fn?.dataTable?.isDataTable(`#${tableId}`)
        ) {
          return null;
        }
        return jquery(`#${tableId}`).DataTable().search();
      });
      if (appliedSearch !== value) return 'search-not-applied';

      const processing = adminPage.locator('#dataset_table_processing:visible');
      if (await processing.count() > 0) return 'processing';
      if (await visibleRows.count() > 0) return 'rows';
      if (await emptyResult.count() > 0) return 'empty';
      return 'waiting';
    }, {
      message: `Dataset admin search for "${value}" did not settle`,
      timeout: 20_000,
      intervals: [250, 500, 1_000, 2_000],
    }).toMatch(/^(?:rows|empty)$/);
    await assertNoWebsiteError(adminPage, `Dataset admin search for "${value}"`);
  };

  const lookupDatasetOnce = async (
    adminPage: Page,
    title: string,
    expectedId?: string
  ): Promise<DatasetLookupState> => {
    const { search, table } = await openDatasetAdmin(adminPage);
    const exactTitle = new RegExp(`^\\s*${escapeRegExp(title)}\\s*$`);

    await filterDatasetAdmin(adminPage, search, table, title);
    const titleRows = table.locator('tbody tr[id]:visible').filter({
      has: adminPage.locator('td:nth-child(2)', { hasText: exactTitle }),
    });
    const titleMatches = await titleRows.count();
    if (titleMatches > 1) {
      throw new Error(`Dataset title "${title}" is not unique in the admin list.`);
    }
    if (titleMatches === 1) {
      const id = await titleRows.getAttribute('id');
      if (!id || !/^\d+$/.test(id) || Number(id) <= 0) {
        throw new Error(`Dataset "${title}" has an invalid admin row id: ${id}`);
      }
      if (expectedId && id !== expectedId) {
        throw new Error(
          `Dataset title "${title}" resolved to id ${id}, expected ${expectedId}.`
        );
      }
      await expect(titleRows.locator('td').nth(0)).toHaveText(id);
      await expect(titleRows.locator('td').nth(1)).toHaveText(title);
      return { kind: 'found', id, title };
    }

    // A title miss is not enough when an id is already known: search the full
    // table again by that unique id and reject an id/title mismatch.
    if (expectedId) {
      await filterDatasetAdmin(adminPage, search, table, expectedId);
      const idRow = table.locator(`tbody tr[id="${expectedId}"]`);
      const idMatches = await idRow.count();
      if (idMatches > 1) {
        throw new Error(`Dataset id ${expectedId} has multiple admin rows.`);
      }
      if (idMatches === 1) {
        const actualTitle = (
          await idRow.locator('td').nth(1).innerText()
        )
          .trim()
          .replace(/\s+/g, ' ');
        throw new Error(
          `Dataset id ${expectedId} still exists with unexpected title "${actualTitle}".`
        );
      }
    }

    return { kind: 'absent', title };
  };

  const pollDataset = async (
    adminPage: Page,
    title: string,
    expectedId: string | undefined,
    target: 'found' | 'absent',
    timeout: number
  ): Promise<DatasetLookupState> => {
    let finalState: DatasetLookupState | undefined;
    let absentReads = 0;

    await expect.poll(async () => {
      const state = await lookupDatasetOnce(adminPage, title, expectedId);
      finalState = state;
      if (state.kind === 'found') {
        absentReads = 0;
        return target === 'found' ? 'found' : 'waiting';
      }

      absentReads += 1;
      return target === 'absent' && absentReads >= 2 ? 'absent' : 'waiting';
    }, {
      message:
        target === 'absent'
          ? `Dataset "${title}" did not disappear from the complete admin list`
          : `Dataset "${title}" never became visible in the complete admin list`,
      timeout,
      intervals: [500, 1_000, 2_000, 5_000],
    }).toMatch(target === 'absent' ? /^absent$/ : /^found$/);

    if (!finalState) {
      throw new Error(`Dataset poll for "${title}" produced no final state.`);
    }
    return finalState;
  };

  const trackDataset = (candidate: unknown, title: string) => {
    const id = String(candidate ?? '').trim();
    if (!/^\d+$/.test(id) || Number(id) <= 0) return undefined;

    datasetIds.add(id);
    datasetTitles.set(id, title);
    pendingDatasetTitles.delete(title);
    return id;
  };

  const datasetIdFromUrl = (url: string) => {
    const parsed = new URL(url, host);
    const queryId = parsed.searchParams.get('id');
    if (queryId && /^\d+$/.test(queryId) && Number(queryId) > 0) {
      return queryId;
    }

    const pathId = parsed.pathname.match(/\/dcm\/edit\/(\d+)\/?$/i)?.[1];
    return pathId && Number(pathId) > 0 ? pathId : undefined;
  };

  const purgeDataset = async (cleanupPage: Page, id: string) => {
    const title = datasetTitles.get(id);
    if (!title) {
      throw new Error(`Dataset ${id} has no tracked title for verified cleanup.`);
    }

    const initialState = await pollDataset(
      cleanupPage,
      title,
      id,
      'found',
      90_000
    );
    expect(
      initialState.kind,
      `Dataset ${id} was never observed in the complete admin list before purge`
    ).toBe('found');

    const row = cleanupPage.locator(`#dataset_table tbody tr[id="${id}"]:visible`);
    await expect(row).toHaveCount(1);
    await expect(row.locator('td').nth(0)).toHaveText(id);
    await expect(row.locator('td').nth(1)).toHaveText(title);
    const purgeLink = row.getByRole('link', { name: 'Purge', exact: true });
    await expect(purgeLink).toHaveCount(1);
    const purgeHref = await purgeLink.getAttribute('href');
    expect(purgeHref, `Dataset ${id} purge link has no href`).toBeTruthy();
    const purgeUrl = new URL(purgeHref!, host);
    expect(purgeUrl.origin, `Dataset ${id} purge link changed origin`).toBe(
      hostOrigin
    );
    expect(normalizePath(purgeUrl.pathname)).toBe(
      normalizePath(`/sam/datasets/purge/${id}`)
    );

    const [purgeResponse] = await Promise.all([
      cleanupPage.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      cleanupPage.waitForEvent('dialog').then(async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      }),
      purgeLink.click(),
    ]);
    expect(purgeResponse, `Dataset ${id} purge returned no navigation response`).toBeTruthy();
    assertResponse(
      purgeResponse!,
      `/sam/datasets/purge/${id}`,
      `Dataset ${id} purge`
    );
    await assertNoWebsiteError(cleanupPage, `Dataset ${id} purge result`);
    await expect(
      cleanupPage.getByRole('heading', {
        name: 'Dataset was successfully purged!',
        exact: true,
      })
    ).toBeVisible();

    const finalState = await pollDataset(
      cleanupPage,
      title,
      id,
      'absent',
      45_000
    );
    expect(finalState.kind, `Dataset ${id} was not confirmed absent`).toBe(
      'absent'
    );
  };

  const createDataset = async (caseNumber: number) => {
    const title = `${runId}-case-${caseNumber}`;

    await page.goto(host);

    const createLink = page.locator('a[href="/dcm/create"]');
    await expect(createLink).toBeVisible();
    await createLink.click();

    const fileTile = page
      .locator('div[role="button"]')
      .filter({ has: page.getByRole('heading', { name: 'File', exact: true }) });
    await expect(fileTile).toHaveCount(1);
    await fileTile.click();

    await page.locator('#Title').fill(title);
    await page
      .locator('#Description')
      .fill(`Playwright tag test run ${runId}, case ${caseNumber}`);

    const createButton = page.locator(
      'button[title="Create a new dataset and continue editing"]'
    );
    await expect(createButton).toBeEnabled();
    pendingDatasetTitles.add(title);
    let observedId: string | undefined;
    let createError: unknown;
    let resolutionError: unknown;
    const rememberDatasetId = (candidate: unknown, source: string) => {
      const candidateId = String(candidate ?? '').trim();
      if (!/^\d+$/.test(candidateId) || Number(candidateId) <= 0) {
        return undefined;
      }
      if (observedId && observedId !== candidateId) {
        trackDataset(candidateId, title);
        throw new Error(
          `Dataset create id mismatch: ${observedId} versus ${candidateId} from ${source}.`
        );
      }
      observedId = trackDataset(candidateId, title);
      return observedId;
    };
    const rememberDatasetUrl = (url: string, source: string) => {
      const candidateId = datasetIdFromUrl(url);
      return candidateId
        ? rememberDatasetId(candidateId, source)
        : undefined;
    };

    try {
      const createResponseCapture = page
        .waitForResponse(
          (response) => {
            const responseUrl = new URL(response.url());
            return (
              response.request().method() === 'POST' &&
              responseUrl.origin === hostOrigin &&
              normalizePath(responseUrl.pathname) === '/dcm/create/create'
            );
          },
          { timeout: 30_000 }
        )
        .then(async (response) => {
          // Consume the API body as soon as Playwright emits the response.
          // Waiting for click/navigation completion first can make Chromium
          // discard the Network resource and break a later response.json().
          const headers = response.headers();
          const contentType = headers['content-type'] || '';
          let payload: unknown;
          let jsonBodyRead = false;
          let bodyError: unknown;

          if (/application\/json/i.test(contentType)) {
            try {
              payload = await response.json();
              jsonBodyRead = true;
            } catch (error) {
              bodyError = error;
            }
          }

          return {
            bodyError,
            contentType,
            jsonBodyRead,
            location: headers['location'],
            payload,
            response,
          };
        });

      const [capture] = await Promise.all([
        createResponseCapture,
        createButton.click(),
      ]);
      const createResponse = capture.response;

      assertResponse(createResponse, '/dcm/create/create', 'Dataset create');

      if (capture.location) {
        rememberDatasetUrl(
          new URL(capture.location, createResponse.url()).toString(),
          'Location header'
        );
      }

      if (capture.jsonBodyRead) {
        if (
          !capture.payload ||
          typeof capture.payload !== 'object' ||
          Array.isArray(capture.payload)
        ) {
          throw new Error(
            `Dataset create returned an unexpected JSON payload for "${title}": ` +
              JSON.stringify(capture.payload)
          );
        }

        const createResult = capture.payload as {
          success?: unknown;
          id?: unknown;
        };
        // Track a returned id even when the API also reports failure, so a
        // partially created dataset remains reachable by the cleanup path.
        rememberDatasetId(createResult.id, 'JSON response');
        if (createResult.success !== true) {
          throw new Error(
            `Dataset create response did not report success=true for "${title}": ` +
              JSON.stringify(createResult)
          );
        }
      }

      await page.waitForURL(
        (url) =>
          url.origin === hostOrigin &&
          normalizePath(url.pathname) === '/dcm/edit',
        { timeout: 20_000 }
      );
      const editorUrl = new URL(page.url());
      expect(editorUrl.origin, 'Dataset editor redirect changed origin').toBe(
        hostOrigin
      );
      expect(
        normalizePath(editorUrl.pathname),
        'Dataset editor redirect changed path'
      ).toBe('/dcm/edit');
      rememberDatasetUrl(page.url(), 'editor redirect');
      await assertNoWebsiteError(page, 'Dataset editor redirect');

      if (capture.bodyError) {
        const bodyErrorMessage = formatError(capture.bodyError);
        const bodyWasDiscardedByChromium =
          /Protocol error \(Network\.getResponseBody\): No resource with given identifier found/i.test(
            bodyErrorMessage
          );
        if (!bodyWasDiscardedByChromium || !observedId) {
          throw new Error(
            `Dataset create response body could not be read: ${bodyErrorMessage}`
          );
        }
      }

      if (!capture.jsonBodyRead && !capture.location && !observedId) {
        throw new Error(
          `Dataset create returned neither readable JSON nor a usable Location/editor id (${capture.contentType || 'no content type'}).`
        );
      }
    } catch (error) {
      createError = error;
      try {
        rememberDatasetUrl(page.url(), 'current page URL after create failure');
      } catch (idError) {
        createError = new Error(
          `${formatError(error)}; ${formatError(idError)}`
        );
      }
    }

    if (!observedId) {
      try {
        const resolvedState = await pollDataset(
          page,
          title,
          undefined,
          'found',
          45_000
        );
        if (resolvedState.kind === 'found') {
          observedId = trackDataset(resolvedState.id, title);
        }
      } catch (error) {
        resolutionError = error;
      }
    }

    if (createError) {
      throw new Error(
        `Dataset creation failed for "${title}": ${formatError(createError)}` +
          (resolutionError
            ? `; orphan resolution also failed and the title remains tracked: ${formatError(resolutionError)}`
            : observedId
              ? `; dataset ${observedId} was tracked for cleanup`
              : '; the create outcome remains unresolved and its title stays tracked')
      );
    }
    if (resolutionError) {
      throw new Error(
        `Could not resolve created dataset "${title}": ${formatError(resolutionError)}`
      );
    }

    expect(observedId, `No dataset id could be resolved for ${title}`).toBeTruthy();

    return observedId!;
  };

  const tagSwitch = (idPrefix: string) =>
    page
      .locator(`[id^="${idPrefix}"]`)
      .first()
      .locator('xpath=ancestor::div[@role="switch"]');

  const runTagCase = async (tagCase: TagCase) => {
    let id: string | undefined;

    try {
      id = await createDataset(tagCase.caseNumber);
      await page.goto(`${host}/ddm/taginfo/?id=${id}`);

      const createVersionButton = page.locator(
        `button[title^="Create new ${tagCase.version} version."]`
      );
      await expect(createVersionButton).toHaveCount(1);
      await expect(createVersionButton).toBeEnabled();
      await startTagToastCapture(page);
      await createVersionButton.click();

      await expectLatestToast(page, 'Release Tag is generated.');

      await setAriaSwitch(tagSwitch('showTagInfo-'), tagCase.showNote);
      await setAriaSwitch(tagSwitch('publish-'), tagCase.publish);

      const saveButton = page.locator('button[id^="saveTagInfo-"]').first();
      await expect(saveButton).toBeEnabled();
      await startTagToastCapture(page);
      await saveButton.click();

      await expectLatestToast(page, 'Release tag changes are saved.');
    } finally {
      if (id && datasetIds.has(id)) {
        try {
          await purgeDataset(page, id);
          datasetIds.delete(id);
          datasetTitles.delete(id);
          purgedDatasetIds.add(id);
        } catch (error) {
          // afterAll retries every id that could not be purged here.
          console.warn(`[tags cleanup] deferred dataset ${id}: ${error}`);
        }
      }
    }
  };

  test.beforeEach(async ({ browser }, testInfo) => {
    testInfo.setTimeout(90_000);

    // A beforeEach failure belongs to exactly one case. Playwright runs this
    // worker's afterAll (which restores the snapshot below) before starting a
    // replacement worker, so a settings-page failure cannot skip every case or
    // make a replacement worker mistake our required values for the baseline.
    if (!page || page.isClosed()) {
      page = await browser.newPage();
      await login(page);
    }

    await openTagSettings(page, host);
    const currentTagSettings = await readTagSettings(page);

    // Capture the worker's baseline before the first possible mutation and
    // never overwrite it on later cases. If applying the settings fails after
    // a partial save, afterAll can still restore the pre-mutation values.
    originalTagSettings ??= { ...currentTagSettings };

    if (!settingsMatch(currentTagSettings, REQUIRED_TAG_SETTINGS)) {
      await applyTagSettings(page, host, REQUIRED_TAG_SETTINGS);
    }
  });

  test.afterAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(240_000);

    const cleanupErrors: string[] = [];
    let settingsRestored = false;
    let cleanupPage: Page | undefined;

    try {
      cleanupPage = await browser.newPage();
      await login(cleanupPage);

      // Restore global settings first so dataset cleanup cannot consume the
      // teardown budget while the application is still globally modified.
      if (originalTagSettings) {
        try {
          await openTagSettings(cleanupPage, host);
          const currentSettings = await readTagSettings(cleanupPage);

          if (!settingsMatch(currentSettings, originalTagSettings)) {
            await applyTagSettings(cleanupPage, host, originalTagSettings);
          }

          settingsRestored = true;
        } catch (error) {
          cleanupErrors.push(`tag settings: ${error}`);
        }
      }

      for (const title of [...pendingDatasetTitles]) {
        try {
          const resolvedState = await pollDataset(
            cleanupPage,
            title,
            undefined,
            'found',
            45_000
          );
          if (resolvedState.kind === 'found') {
            trackDataset(resolvedState.id, title);
          }
        } catch (error) {
          cleanupErrors.push(`dataset title "${title}": ${error}`);
        }
      }

      for (const id of [...datasetIds]) {
        try {
          await purgeDataset(cleanupPage, id);
          datasetIds.delete(id);
          datasetTitles.delete(id);
          purgedDatasetIds.add(id);
        } catch (error) {
          cleanupErrors.push(`dataset ${id}: ${error}`);
        }
      }
    } catch (error) {
      cleanupErrors.push(`cleanup setup: ${error}`);
    } finally {
      if (cleanupPage && !cleanupPage.isClosed()) {
        await cleanupPage.close();
      }
      if (page && !page.isClosed()) {
        await page.close();
      }
    }

    expect(cleanupErrors, cleanupErrors.join('\n')).toEqual([]);
    expect([...datasetIds], 'Unpurged tag-test datasets').toEqual([]);
    expect(
      [...pendingDatasetTitles],
      'Unresolved tag-test dataset titles'
    ).toEqual([]);
    if (originalTagSettings) {
      expect(settingsRestored, 'Original tag settings were not restored').toBe(
        true
      );
    }
  });

  for (const tagCase of TAG_CASES) {
    const versionName =
      tagCase.version[0].toUpperCase() + tagCase.version.slice(1);
    const enabledOptions = [
      tagCase.showNote ? 'show note' : undefined,
      tagCase.publish ? 'publish tag' : undefined,
    ]
      .filter(Boolean)
      .join(' and ');

    test(`Case ${tagCase.caseNumber} - ${versionName} - ${enabledOptions}`, async () => {
      await runTagCase(tagCase);
    });
  }
});
