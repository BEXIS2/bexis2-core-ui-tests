import { test } from '@playwright/test';

import { gotoApp, login } from '../shared';

test('Component configuration page loads', async ({ page }) => {
  await login(page);
  await gotoApp(page, '/dcm/componentconfig/', 'button[title="create"]');
});
