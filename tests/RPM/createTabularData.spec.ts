import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

const {
    createNewtabularData,
    uploadfiles,
    markingVariableData,
    EnterTitleandDesc,
    AssignDataTypeDisplayPattern,
    markPrimaryandSave,
    validatePrimaryandSucessSymbols,
    replaceUploadFile,
    submitData,
} = require('./utils/tabularDataFunctions');
const { cleanupDataStructure } = require('./utils/dataStructureFunctions');

import { gotoApp, login } from '../shared';

const formatCases = [
    ['date', 'dd.MM.yy'],
    ['date', 'dd.MM.yyyy'],
    ['date', 'dd/MM/yy'],
    ['date', 'dd/MM/yyyy'],
    ['date', 'M/d/yyyy'],
    ['Date and Time', 'M/d/yyyy h:m'],
    ['date', 'MM/dd/yy'],
    ['date', 'MM/dd/yyyy'],
    ['date', 'yy-MM-dd'],
    ['date', 'yyyy-dd-MM'],
    ['date', 'yyyy-d-M'],
    ['date', 'yyyy-M-d'],
    ['date', 'yyyy-MM-dd'],
    ['time', 'HH:mm'],
    ['time', 'hh:mm tt'],
    ['time', 'HH:mm:ss'],
    ['time', 'hh:mm:ss tt'],
    ['date', 'MM'],
    ['date', 'yyyy'],
] as const;

type DatasetAdminRow = {
    id: string;
    title: string;
    purgeHref: string | null;
};

test.describe('Tabular data lifecycle', () => {
    let datasetId: string | undefined;
    let datasetTitle: string | undefined;
    let dataStructureTitle: string | undefined;
    let datasetCreateAttempted = false;
    let purgeConfirmedDatasetId: string | undefined;

    const openDatasetAdmin = async (
        page: Page,
        adminUrl: string
    ): Promise<DatasetAdminRow[]> => {
        const response = await page.goto(adminUrl, { waitUntil: 'domcontentloaded' });
        if (!response) {
            throw new Error('Dataset admin navigation returned no response.');
        }
        if (!response.ok()) {
            throw new Error(
                'Dataset admin request failed: ' + response.status() + ' ' + response.statusText()
            );
        }

        const expectedUrl = new URL(adminUrl);
        const currentUrl = new URL(page.url());
        expect(currentUrl.origin, 'Dataset admin redirected to another origin').toBe(expectedUrl.origin);
        expect(
            currentUrl.pathname.replace(/\/$/, '').toLowerCase(),
            'Dataset admin redirected to an unexpected page'
        ).toBe(expectedUrl.pathname.replace(/\/$/, '').toLowerCase());

        const fatalErrorUi = page.locator(
            '.alert-danger:visible, .validation-summary-errors:visible, [data-testid="error"]:visible'
        );
        await expect(fatalErrorUi, 'Dataset admin rendered an application error').toHaveCount(0);
        await expect(
            page.getByRole('heading', {
                name: /^(?:error|internal server error|unhandled exception)$/i,
            }),
            'Dataset admin rendered an error page'
        ).toHaveCount(0);

        const table = page.locator('#dataset_table');
        await expect(page.getByRole('heading', { name: 'Datasets', exact: true })).toBeVisible();
        await expect(table, 'Dataset admin table is missing').toBeVisible();
        await expect(table.locator('thead th').first()).toHaveText('ID');
        await expect(table.locator('thead th').nth(1)).toHaveText('Title');
        await expect(table.locator('thead th').last()).toHaveText('Actions');

        // The current SAM page registers every server-rendered dataset with a
        // client-side DataTable (paging is currently disabled). Enumerating the
        // DataTables row registry, rather than only the rendered page, also
        // remains complete if client-side pagination is enabled later.
        await expect.poll(async () => await page.evaluate(() => {
            const browserWindow = window as typeof window & { jQuery?: any };
            const jquery = browserWindow.jQuery;
            return Boolean(
                jquery?.fn?.dataTable?.isDataTable &&
                jquery.fn.dataTable.isDataTable('#dataset_table')
            );
        }), {
            message: 'Dataset admin table did not finish initializing',
            timeout: 30_000,
        }).toBe(true);

        const snapshot = await page.evaluate(() => {
            const browserWindow = window as typeof window & { jQuery?: any };
            const jquery = browserWindow.jQuery;
            if (!jquery?.fn?.dataTable?.isDataTable?.('#dataset_table')) return null;

            const api = jquery('#dataset_table').DataTable();
            const info = api.page.info();
            const nodes = api.rows().nodes().toArray() as HTMLTableRowElement[];
            const rows = nodes.map((row) => {
                const purgeAnchor = [...row.querySelectorAll('a')].find(
                    (anchor) => anchor.textContent?.trim() === 'Purge'
                );
                return {
                    id: row.id.trim(),
                    title: (row.cells[1]?.textContent || '').trim(),
                    purgeHref: purgeAnchor?.getAttribute('href') || null,
                };
            });

            return {
                recordsTotal: Number(info.recordsTotal),
                recordsDisplay: Number(info.recordsDisplay),
                rows,
            };
        });

        expect(snapshot, 'Dataset admin DataTable state is unavailable').not.toBeNull();
        expect(
            snapshot!.recordsDisplay,
            'Dataset admin opened with an active filter and cannot prove absence'
        ).toBe(snapshot!.recordsTotal);
        expect(
            snapshot!.rows.length,
            'Dataset admin did not expose every row across pagination'
        ).toBe(snapshot!.recordsTotal);

        const rowIds = new Set<string>();
        for (const row of snapshot!.rows) {
            expect(row.id, 'Dataset admin row has an invalid id').toMatch(/^\d+$/);
            expect(rowIds.has(row.id), 'Dataset admin contains duplicate id ' + row.id).toBe(false);
            rowIds.add(row.id);
        }

        return snapshot!.rows;
    };

    const purgeDataset = async (
        page: Page,
        id: string | undefined,
        title: string,
        onResolvedId: (resolvedId: string) => void = () => {}
    ) => {
        const baseUrl = (process.env.HOST || 'https://rc.bexis2.uni-jena.de').replace(/\/$/, '');
        const adminUrl = baseUrl + '/sam/datasets/index/datasets';
        let consecutiveConfirmedAbsentReads = 0;
        let datasetState = 'waiting';
        let targetRow: DatasetAdminRow | undefined;
        let resolvedDatasetId = id;

        const findTargetRow = (rows: DatasetAdminRow[]) => {
            const rowsById = id ? rows.filter((row) => row.id === id) : [];
            const rowsByTitle = rows.filter((row) => row.title === title);

            if (rowsByTitle.length > 1) {
                throw new Error('Dataset title "' + title + '" is not unique in the admin list.');
            }
            if (rowsById.length > 1) {
                throw new Error('Dataset id ' + id + ' occurs more than once in the admin list.');
            }
            if (rowsById.length === 1) {
                if (rowsById[0].title !== title) {
                    throw new Error(
                        'Dataset ' + id + ' has title "' + rowsById[0].title +
                        '" instead of expected "' + title + '".'
                    );
                }
                return rowsById[0];
            }
            if (id && rowsByTitle.length === 1) {
                throw new Error(
                    'Dataset title "' + title + '" exists under unexpected id ' + rowsByTitle[0].id + '.'
                );
            }
            return rowsByTitle[0];
        };

        await expect.poll(async () => {
            const rows = await openDatasetAdmin(page, adminUrl);
            targetRow = findTargetRow(rows);
            if (targetRow) {
                consecutiveConfirmedAbsentReads = 0;
                if (resolvedDatasetId !== targetRow.id) {
                    resolvedDatasetId = targetRow.id;
                    onResolvedId(targetRow.id);
                }
                datasetState = targetRow.purgeHref ? 'purgeable' : 'waiting';
                return datasetState;
            }

            // A newly created dataset may reach the SAM admin index well after
            // its create request/navigation completed. Therefore list misses
            // never prove that a tracked create is absent. Absence is accepted
            // only after this exact id already received a successful purge
            // navigation in an earlier cleanup attempt.
            const absenceIsBackedByPurge = Boolean(
                resolvedDatasetId && purgeConfirmedDatasetId === resolvedDatasetId
            );
            consecutiveConfirmedAbsentReads = absenceIsBackedByPurge
                ? consecutiveConfirmedAbsentReads + 1
                : 0;
            datasetState = consecutiveConfirmedAbsentReads >= 2 ? 'absent' : 'waiting';
            return datasetState;
        }, {
            message:
                'Dataset ' + (id || title) +
                ' never became purgeable and has no confirmed purge proving absence',
            timeout: 90_000,
            intervals: [500, 1_000, 2_000, 5_000],
        }).toMatch(/^(purgeable|absent)$/);

        if (datasetState === 'absent') return;
        if (!targetRow || !resolvedDatasetId || !targetRow.purgeHref) {
            throw new Error('Dataset became purgeable without a resolved admin row.');
        }

        const purgeUrl = new URL(targetRow.purgeHref, adminUrl);
        expect(purgeUrl.origin, 'Dataset purge link points to another origin').toBe(
            new URL(adminUrl).origin
        );
        const purgePathId = purgeUrl.pathname.match(/\/sam\/datasets\/purge\/(\d+)\/?$/i)?.[1];
        const purgeQueryId = purgeUrl.searchParams.get('id');
        expect(
            purgePathId || purgeQueryId,
            'Dataset purge link does not contain the resolved dataset id'
        ).toBe(resolvedDatasetId);

        const targetRowLocator = page.locator(
            '#dataset_table tbody tr[id="' + resolvedDatasetId + '"]'
        );
        await expect(targetRowLocator).toHaveCount(1);
        const purgeLink = targetRowLocator.getByRole('link', { name: 'Purge', exact: true });
        await expect(purgeLink).toHaveCount(1);
        await expect(purgeLink).toHaveAttribute('href', targetRow.purgeHref);
        await expect(purgeLink).toBeVisible();

        const [purgeResponse] = await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.waitForEvent('dialog').then((dialog) => dialog.accept()),
            purgeLink.click(),
        ]);
        expect(
            purgeResponse,
            'Dataset purge returned no navigation response'
        ).toBeTruthy();
        expect(
            purgeResponse!.ok(),
            'Dataset purge request failed: ' + purgeResponse!.status()
        ).toBeTruthy();
        const purgeResponseUrl = new URL(purgeResponse!.url());
        expect(purgeResponseUrl.origin, 'Dataset purge response changed origin').toBe(
            purgeUrl.origin
        );
        expect(
            purgeResponseUrl.pathname.replace(/\/$/, '').toLowerCase(),
            'Dataset purge response changed path'
        ).toBe(purgeUrl.pathname.replace(/\/$/, '').toLowerCase());
        purgeConfirmedDatasetId = resolvedDatasetId;

        await expect.poll(async () => {
            const rows = await openDatasetAdmin(page, adminUrl);
            return {
                ids: rows.filter((row) => row.id === resolvedDatasetId).length,
                titles: rows.filter((row) => row.title === title).length,
            };
        }, {
            message: 'Dataset ' + resolvedDatasetId + ' remained in the complete admin list after purge',
            timeout: 30_000,
            intervals: [500, 1_000, 2_000],
        }).toEqual({ ids: 0, titles: 0 });
    };

    const cleanupPending = async (browser: Browser) => {
        const cleanupErrors: string[] = [];
        const cleanupPage = await browser.newPage();

        try {
            await login(cleanupPage);

            if (datasetTitle && !datasetCreateAttempted && !datasetId) {
                // The test failed before entering the create helper, so no
                // dataset request could have been started for this title.
                datasetTitle = undefined;
            }

            if (datasetId || datasetTitle) {
                try {
                    if (!datasetTitle) {
                        throw new Error('Dataset title is unavailable for verified cleanup.');
                    }
                    await purgeDataset(
                        cleanupPage,
                        datasetId,
                        datasetTitle,
                        (resolvedId) => { datasetId = resolvedId; }
                    );
                    datasetId = undefined;
                    datasetTitle = undefined;
                    datasetCreateAttempted = false;
                    purgeConfirmedDatasetId = undefined;
                } catch (error) {
                    cleanupErrors.push('dataset ' + (datasetId || datasetTitle) + ': ' + error);
                }
            }

            if (dataStructureTitle) {
                try {
                    await cleanupDataStructure(cleanupPage, dataStructureTitle);
                    dataStructureTitle = undefined;
                } catch (error) {
                    cleanupErrors.push('data structure ' + dataStructureTitle + ': ' + error);
                }
            }
        } finally {
            await cleanupPage.close();
        }

        if (cleanupErrors.length > 0) {
            throw new Error('Tabular-data cleanup failed:\n' + cleanupErrors.join('\n'));
        }
    };

    test.afterEach(async ({ browser }, testInfo) => {
        testInfo.setTimeout(180_000);
        await test.step('Clean up dataset and data structure', async () => {
            await cleanupPending(browser);
        });
    });

    test.afterAll(async ({ browser }) => {
        if (!datasetId && !datasetTitle && !dataStructureTitle) return;
        test.setTimeout(180_000);
        await cleanupPending(browser);
    });

    test('creates, configures and imports a tabular dataset', async ({ page }, testInfo) => {
        testInfo.setTimeout(240_000);
        const runId = String(Date.now()) + '-' + testInfo.workerIndex + '-' + testInfo.retry;
        const tabularTitle = 'test-' + runId;
        datasetTitle = tabularTitle;
        dataStructureTitle = 'Alpha' + tabularTitle;

        await test.step('Open tabular dataset creation', async () => {
            await login(page);
            await gotoApp(page, '/dcm/create/', '.breadcrumb');
            await expect(page.locator('.breadcrumb > :nth-child(3)')).toBeVisible();
        });

        await test.step('Create dataset and capture its id', async () => {
            // From this point onward, a missing admin row is an unknown create
            // outcome rather than proof that no resource exists.
            datasetCreateAttempted = true;
            datasetId = await createNewtabularData(
                page,
                tabularTitle,
                'Playwright tabular-data lifecycle',
                (id: string) => { datasetId = id; }
            );
        });

        await test.step('Upload the source CSV', async () => {
            await uploadfiles(page);
        });

        await test.step('Mark variable and data rows', async () => {
            await markingVariableData(page);
        });

        await test.step('Enter data-structure metadata', async () => {
            await EnterTitleandDesc(page, dataStructureTitle, 'Playwright tabular-data lifecycle');
        });

        await test.step('Configure column types and display patterns', async () => {
            for (const [index, [dataType, displayPattern]] of formatCases.entries()) {
                await test.step(
                    'Column ' + (index + 1) + ': ' + dataType + ' / ' + displayPattern,
                    async () => {
                        await AssignDataTypeDisplayPattern(page, index, dataType, displayPattern);
                    }
                );
            }
        });

        await test.step('Save and verify the data structure', async () => {
            await markPrimaryandSave(page);
            await validatePrimaryandSucessSymbols(page, dataStructureTitle);
        });

        await test.step('Upload the source CSV for import', async () => {
            await replaceUploadFile(page);
        });

        await test.step('Submit and verify the import', async () => {
            await submitData(page, datasetId);
        });
    });
});
