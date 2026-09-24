import { test, expect } from '@playwright/test';

import { registerUser, verifyUserEmail } from './auth-utils';

test.describe('Save and reload tests', () => {
  test('should persist list edits to the share page', async ({ page }) => {
    test.setTimeout(60000);
    const now = Date.now();
    const username = `save${now}`;
    const email = `save+${now}@lighterpack.com`;
    const password = 'testtest';
    const listName = `Saved List ${now}`;
    const itemName = 'Saved Backpack';
    const itemDescription = 'Still here after reload';
    const isSuccessfulExternalId = (response) => response.url().includes('/externalId') && response.ok();
    const isSuccessfulSave = (response) => response.url().includes('/saveLibrary') && response.ok();

    await registerUser(page, username, password, email);
    await verifyUserEmail(username);

    await page.getByPlaceholder('List Name').fill(listName);
    await page.locator('.lpAddItem').first().click();
    await page.locator('.lpAddItemInput').first().fill(itemName);
    await page.locator('.lpAddItemInput').first().press('Enter');
    await expect(page.locator('.lpItem .lpName').first()).toHaveValue(itemName);
    await page.locator('.lpItem .lpName').first().fill(itemName);
    await page.locator('.lpItem .lpDescription').first().fill(itemDescription);
    await page.locator('.lpItem .lpWeight').first().fill('880');

    const editedFieldsSave = page.waitForResponse(isSuccessfulSave, { timeout: 35000 });
    await page.locator('.lpItem .lpQty').first().fill('2');
    await editedFieldsSave;

    const externalIdResponse = page.waitForResponse(isSuccessfulExternalId, { timeout: 35000 });
    await page.getByText('Share', { exact: true }).hover();
    await externalIdResponse;

    const shareUrlLocator = page.locator('#shareUrl');
    await expect(shareUrlLocator).toHaveValue(/\S/, { timeout: 35000 });
    const shareUrl = await shareUrlLocator.inputValue();

    await expect(async () => {
      const response = await page.request.get(shareUrl);
      expect(response.status()).toBe(200);
    }).toPass();

    await page.goto(shareUrl);

    const firstSharedItem = page.locator('.lpPublicListItem').first();
    await expect(page.locator('h1.lpPublicListTitle')).toHaveText(listName);
    await expect(firstSharedItem.locator('.lpPublicListItemName')).toContainText(itemName);
    await expect(firstSharedItem.locator('.lpPublicListItemMeta')).toContainText(itemDescription);
    await expect(firstSharedItem.locator('.lpPublicListItemWeight')).toContainText('1760 oz');
    await expect(firstSharedItem.locator('.lpPublicListItemQty')).toContainText('×2');
  });
});
