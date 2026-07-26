import { test, expect } from '@playwright/test';

import { testRoot } from './utils';

test('shows the editor loading shell while session data loads', async ({ page }) => {
    await page.route('**/signin', async route => {
        await new Promise(resolve => setTimeout(resolve, 800));
        await route.continue();
    });

    await page.goto(testRoot);

    await expect(page.locator('.lpEditorLoading')).toBeVisible();
});
