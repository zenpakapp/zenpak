import { test, expect } from '@playwright/test';

import {
    LARGE_LIBRARY_ITEM_COUNT,
    mockSuccessfulEditorInitialization,
} from './editor-fixture';
import { testRoot } from './utils';

test.beforeEach(async ({ page }) => {
    await mockSuccessfulEditorInitialization(page);
    await page.goto(testRoot);
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('.library')).toBeVisible();
});

test('keyboard scrolling reaches logical rows beyond the first virtual window', async ({ page }) => {
    const library = page.locator('.library');
    const renderedRows = library.locator('.lpLibraryItem');

    await expect(library).toHaveAttribute('aria-label', 'Items');
    await expect(library).toHaveAttribute('tabindex', '0');
    await library.focus();
    await expect(library).toBeFocused();
    await expect(renderedRows.first()).toHaveAttribute('aria-setsize', String(LARGE_LIBRARY_ITEM_COUNT));
    await expect(renderedRows.first()).toHaveAttribute('aria-posinset', '1');

    await library.press('PageDown');
    await library.press('PageDown');

    await expect.poll(() => library.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await expect.poll(async () => Number(await renderedRows.first().getAttribute('aria-posinset'))).toBeGreaterThan(1);
    await expect(renderedRows).not.toHaveCount(LARGE_LIBRARY_ITEM_COUNT);
});

test('preserves a later virtual window while visible-row edit and removal remain functional', async ({ page }) => {
    const library = page.locator('.library');
    const renderedRows = library.locator('.lpLibraryItem');
    const targetScrollTop = 200 * 52;

    await library.evaluate((element, scrollTop) => {
        element.scrollTop = scrollTop;
    }, targetScrollTop);

    await expect.poll(() => library.evaluate(element => element.scrollTop)).toBe(targetScrollTop);
    await expect.poll(async () => Number(await renderedRows.first().getAttribute('aria-posinset'))).toBeGreaterThan(1);
    await expect(renderedRows).not.toHaveCount(LARGE_LIBRARY_ITEM_COUNT);
    expect(await renderedRows.count()).toBeLessThanOrEqual(25);

    const targetRow = renderedRows.filter({ hasText: 'Fixture item 201' });
    await expect(targetRow).toHaveCount(1);
    await targetRow.dblclick();
    await expect(page.locator('#itemDetailDialog')).toBeVisible();
    await expect(page.locator('#itemDetailDialog')).toContainText('Fixture item 201');

    await page.getByRole('button', { name: 'Edit gear' }).click();
    const nameInput = page.locator('#itemDetailDialog .itemDetailEditForm input[type="text"]').first();
    await nameInput.fill('Fixture item 201 edited');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => library.evaluate(element => element.scrollTop)).toBe(targetScrollTop);
    await expect(renderedRows.filter({ hasText: 'Fixture item 201 edited' })).toHaveCount(1);

    await page.getByText('Delete', { exact: true }).click();
    await expect(page.locator('#speedbump')).toBeVisible();
    const confirmDelete = page.getByRole('button', { name: 'Yes', exact: true });
    await expect(confirmDelete).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(renderedRows.filter({ hasText: 'Fixture item 201 edited' })).toHaveCount(0);
    await expect.poll(() => library.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await expect.poll(async () => Number(await renderedRows.first().getAttribute('aria-posinset'))).toBeGreaterThan(1);
    expect(await renderedRows.count()).toBeLessThanOrEqual(25);
});
