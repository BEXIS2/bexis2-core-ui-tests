import { test as base, expect } from '@playwright/test';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { searchNamedTable } from '../RPM/utils/tableAssertions';
import { expectAndDismissToast } from '../RPM/utils/toastAssertions';
import { login, host } from '../shared';
const { deleteConstraint } = require('../RPM/utils/uniqueFunction');
const { deleteVariable, checkVariables } = require('../RPM/utils/variableFormFunctions');
const { checkDataStructure } = require('../RPM/utils/dataStructureFunctions');

type Item = { name: string };
type Site = {
  url: string;
  items: Item[];
  status: number;
  html: string;
};

const test = base.extend<{ site: Site }>({
  site: async ({}, use) => {
    const site: Site = { url: '', items: [], status: 200, html: '' };
    const server = createServer((req, res) => {
      if (req.url === '/items') {
        res.writeHead(site.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(site.items));
      } else if (/\/Get(?:Constraints|VariableTemplates)$/.test(req.url || '')) {
        res.writeHead(site.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(site.items));
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(site.html);
      }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    site.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      await use(site);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  },
});

function tableHTML(tableId: string, items: Item[], query = '', brokenSearch = false) {
  return `<form id="search">
    <input id="${tableId}-search" value="${query}">
    <button id="${tableId}-searchSubmit">Search</button>
    </form><div id="rows"></div>
    <script>
      const items = ${JSON.stringify(items)};
      const input = document.getElementById('${tableId}-search');
      function render() {
        const found = ${brokenSearch} ? [] : items.filter(item => item.name.includes(input.value));
        document.getElementById('rows').innerHTML = found.length
          ? found.map((item, i) => '<div id="${tableId}-row-' + i + '"><span>' + item.name + '</span></div>').join('')
          : '<div>No rows available</div>';
      }
      document.getElementById('search').onsubmit = event => { event.preventDefault(); render(); };
      render();
    </script>`;
}

for (const [tableId, remove] of [
  ['constraints', deleteConstraint],
  ['VariableTemplates', deleteVariable],
] as const) {
  test(`${tableId}: cleanup accepts an empty database and a previous empty search`, async ({ page, site }) => {
    site.html = tableHTML(tableId, [], 'previous-missing-record');
    await page.goto(site.url);
    expect(await remove(page, 'already-deleted', true)).toBe(false);
  });

  test(`${tableId}: repeated search may keep the same row IDs`, async ({ page, site }) => {
    site.items = [{ name: 'only-record' }];
    site.html = tableHTML(tableId, site.items, 'only-record');
    await page.goto(site.url);
    const { row } = await searchNamedTable(page, { tableId, listPath: '/items', name: 'only-record' });
    await expect(row).toHaveCount(1);
  });
}

for (const closingQuote of ['"', '']) {
  test(`constraint deletion accepts ${closingQuote ? 'correct' : 'RC'} confirmation punctuation`, async ({ page, site }) => {
    const name = 'domain.[test]+(1)';
    site.items = [{ name }];
    site.html = `<form onsubmit="event.preventDefault()">
      <input id="constraints-search"><button id="constraints-searchSubmit">Search</button>
      </form><div id="constraints-row-1"><span>${name}</span>
        <button id="delete-1" onclick="document.querySelector('.modal').hidden=false">Delete</button>
      </div><div class="modal" hidden>
        <header class="modal-header">Delete Constraint</header>
        <article class="modal-body">Are you sure you wish to delete Constraint "${name}${closingQuote}?</article>
        <footer class="modal-footer"><button class="variant-filled"
          onclick="document.body.dataset.confirmed='true';document.querySelector('.modal').hidden=true">Confirm</button></footer>
      </div>`;
    await page.goto(site.url);
    expect(await deleteConstraint(page, name, false, true)).toBe(true);
    await expect(page.locator('body')).toHaveAttribute('data-confirmed', 'true');
  });
}

test('cleanup fails when the backend has a record that the UI cannot find', async ({ page, site }) => {
  site.items = [{ name: 'saved-but-hidden' }];
  site.html = tableHTML('constraints', site.items, '', true);
  await page.goto(site.url);
  await expect(deleteConstraint(page, 'saved-but-hidden', true)).rejects.toThrow('toHaveCount');
});

test('cleanup does not interpret a failed list request as an empty database', async ({ page, site }) => {
  site.status = 500;
  site.html = tableHTML('constraints', []);
  await page.goto(site.url);
  await expect(deleteConstraint(page, 'unknown', true)).rejects.toThrow('Cannot read persisted constraints records');
});

const toast = (message: string, style = 'success') => `<div class="toast variant-filled-${style}" data-testid="toast">
  <div class="text-base">${message}</div><button onclick="this.parentElement.remove()">Dismiss toast</button></div>`;

test('the expected toast is selected independently of other notifications', async ({ page }) => {
  await page.setContent(toast('Unrelated notification') + toast('Constraint saved.'));
  await expectAndDismissToast(page, 'Constraint saved.');
  await expect(page.getByText('Unrelated notification', { exact: true })).toBeVisible();
});

test('the notification may arrive after a server response taking over five seconds', async ({ page }) => {
  await page.setContent('<main>Saving</main>');
  await page.evaluate(html => {
    setTimeout(() => document.body.insertAdjacentHTML('beforeend', html), 5_500);
  }, toast('Constraint saved.'));
  await expectAndDismissToast(page, 'Constraint saved.');
});

test('a success toast does not hide an accompanying application error', async ({ page }) => {
  const error = 'An item with the same key has already been added.';
  await page.setContent(toast(error, 'error') + toast('Constraint saved.'));
  await expect(expectAndDismissToast(page, 'Constraint saved.')).rejects.toThrow(`Website error toast detected:\n${error}`);
});

test('an explicitly expected validation error can be asserted and dismissed', async ({ page }) => {
  const validation = 'Cannot save Constraint: Domain is not defined';
  await page.setContent(toast(validation, 'error'));
  await expectAndDismissToast(page, validation);
  await expect(page.locator('.toast')).toHaveCount(0);
});

test('login completes while unrelated images on both pages keep loading', async ({ page }) => {
  test.setTimeout(10_000);
  test.skip(!process.env.ACCOUNT_USERNAME || !process.env.ACCOUNT_PASSWORD, 'Login credentials are not configured');
  await page.route(`${new URL(host).origin}/**`, async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/never-finishes.png') return;
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 302, headers: { location: '/ddm/search' } });
    } else {
      await route.fulfill({ contentType: 'text/html', body: url.pathname === '/Account/Login'
        ? '<form method="post"><input id="UserName"><input id="Password" type="password"><input type="submit"></form><img src="/never-finishes.png">'
        : '<main>Search</main><img src="/never-finishes.png">' });
    }
  });
  await login(page);
  await expect(page).toHaveURL(`${host.replace(/\/$/, '')}/ddm/search`);
});

function dataStructureHTML() {
  return `<button id="create" onclick="document.getElementById('type').hidden=false">Create</button>
    <button id="type" class="btn variant-filled-primary grow" hidden>Tabular</button><div id="form"></div>
    <script>
      document.getElementById('type').onclick = async () => {
        const response = await fetch('/rpm/DataStructure/empty');
        if (!response.ok) return;
        await response.json();
        document.getElementById('form').innerHTML = '<input id="title"><textarea id="description"></textarea><button>Add variable</button><button disabled>Save</button>';
      };
    </script>`;
}

test('data structure validation waits for a response taking longer than five seconds', async ({ page, site }) => {
  site.html = dataStructureHTML();
  await page.route('**/rpm/DataStructure/empty', async route => {
    await new Promise(resolve => setTimeout(resolve, 5_500));
    await route.fulfill({ json: {} });
  });
  await page.goto(site.url);
  await checkDataStructure(page, 'test-title', true, false, false, false, false, false, false);
  await expect(page.locator('#title')).toHaveValue('test-title');
});

test('data structure validation still fails on an actual server error', async ({ page, site }) => {
  site.html = dataStructureHTML();
  await page.route('**/rpm/DataStructure/empty', route => route.fulfill({ status: 500, json: {} }));
  await page.goto(site.url);
  await expect(checkDataStructure(page, 'test-title', true, false, false, false, false, false, false))
    .rejects.toThrow('Loading the empty data structure failed: HTTP 500');
});

test('variable validation and Cancel wait until dependent dropdowns finish updating', async ({ page }) => {
  await page.setContent(`<button id="create" onclick="document.getElementById('variable-0-form').hidden=false">Create</button>
    <div id="variable-0-form" hidden>
      <input id="name"><textarea id="description"></textarea>
      <button type="button" id="unit" onclick="document.getElementById('options').hidden=false">Unit</button>
      <div id="options" hidden><button type="button" class="list-item">none</button></div>
      <div id="loading"></div><button type="button" id="save" disabled>Save</button>
      <button type="button" id="cancel">Cancel</button>
    </div>
    <script>
      document.querySelector('.list-item').onclick = () => {
        document.getElementById('options').hidden = true;
        document.getElementById('loading').innerHTML = '<span class="icon loading">Loading</span>';
        setTimeout(() => document.getElementById('loading').replaceChildren(), 300);
      };
      document.getElementById('cancel').onclick = () => {
        if (document.querySelector('.icon.loading')) document.body.dataset.earlyCancel = 'true';
        else document.getElementById('variable-0-form').remove();
      };
    </script>`);
  await checkVariables(page, 'unsaved-variable', { unit: 'none', canSave: false });
  await expect(page.locator('body')).not.toHaveAttribute('data-early-cancel', 'true');
});
