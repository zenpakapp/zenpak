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

    await expect(page.locator('.lpEditorLoading')).toBeVisible();
    releaseSignin();
    await navigation;
});
