import { test, expect } from '@playwright/test';

import { testRoot } from './utils';

test('shows the editor loading shell while session data loads', async ({ page }) => {
    let releaseSignin = () => {};
    const signinBlocked = new Promise<void>(resolve => {
        releaseSignin = resolve;
    });

    await page.route('**/signin', async route => {
        await signinBlocked;
        await route.continue();
    });

    const navigation = page.goto(testRoot);
    try {
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('.lpEditorLoading')).toBeVisible();
        await expect(page.locator('.lpEditorLoadingSidebar')).toBeVisible();
        await expect(page.locator('.lpEditorLoadingToolbar')).toBeVisible();
        await expect(page.locator('.lpEditorLoadingRow')).toHaveCount(5);
    } finally {
        releaseSignin();
        await navigation;
    }
});
