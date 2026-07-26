import { test, expect } from '@playwright/test';

import {
    createSigninPayload,
    mockEditorAncillaryRequests,
} from './editor-fixture';
import { testRoot } from './utils';

test('hands the loading shell off to the editor when session data is ready', async ({ page }) => {
    let releaseSignin = () => {};
    const signinBlocked = new Promise<void>(resolve => {
        releaseSignin = resolve;
    });

    await mockEditorAncillaryRequests(page);
    await page.route('**/signin', async route => {
        await signinBlocked;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(createSigninPayload()),
        });
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

    await expect(page.locator('.lpEditorLoading')).toBeHidden();
    await expect(page.locator('#main')).toBeVisible();
});

test('leaves the loading shell for welcome when initialization is ready without a library', async ({ page }) => {
    await mockEditorAncillaryRequests(page);
    await page.route('**/signin', route => route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Synthetic library not found.' }),
    }));

    await page.goto(testRoot);

    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.locator('.lpEditorLoading')).toBeHidden();
    await expect(page.locator('#main')).toHaveCount(0);
    await expect(page.locator('#lpWelcomeContainer')).toBeVisible();
});

test('leaves the loading shell and reports an initialization error', async ({ page }) => {
    await mockEditorAncillaryRequests(page);
    await page.route('**/signin', route => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Synthetic initialization failed.' }),
    }));

    await page.goto(testRoot);

    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.locator('.lpEditorLoading')).toBeHidden();
    await expect(page.locator('.lpGlobalAlertMessage')).toContainText('Synthetic initialization failed.');
});
