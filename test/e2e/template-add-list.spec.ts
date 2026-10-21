import { test, expect } from '@playwright/test';
import { registerUser } from './auth-utils';

async function openTemplatePicker(page) {
    await page.locator('.listContainerHeader a.lpAdd').first().hover();
    await page.getByRole('button', { name: 'New list from a template' }).click();
    await expect(page.getByText('Start from a template')).toBeVisible();
}

test.describe('Add a list from a template after signup', () => {
    test('adds the template as a new list and keeps the first one', async ({
        page,
    }) => {
        const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
        await registerUser(
            page,
            `tpladd${now}`,
            'testtest',
            `tpladd+${now}@lighterpack.com`,
        );
        await expect(page.locator('.accountDropdownName')).toBeVisible();
        const listsBefore = await page.locator('#lists .lpLibraryList').count();

        await openTemplatePicker(page);
        // Add mode: no profile, units or currency setup, and no blank card.
        await expect(page.getByText('What is your next adventure?')).toHaveCount(0);
        await expect(page.getByText('Currency')).toHaveCount(0);
        await page.fill('#template-list-name', 'Dolomites 2027');
        const card = page.locator('button.lpTemplatePickerCard', { hasText: 'Via ferrata' });
        await card.click();

        await expect(page.getByText('Start from a template')).toHaveCount(0);
        await expect(page.locator('#lists .lpLibraryList')).toHaveCount(
            listsBefore + 1,
        );
        await expect(page.locator('#lists .lpLibraryList.lpActive')).toContainText(
            'Dolomites 2027',
        );
        await expect(page.locator('.lpItem')).toHaveCount(32);
    });

    test('categories-only template adds the nine categories without items', async ({
        page,
    }) => {
        const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
        await registerUser(
            page,
            `tplcat${now}`,
            'testtest',
            `tplcat+${now}@lighterpack.com`,
        );
        await expect(page.locator('.accountDropdownName')).toBeVisible();

        await openTemplatePicker(page);
        const card = page
            .getByText('Empty list with categories', { exact: true })
            .locator('..');
        await card.click();

        await expect(page.locator('#lists .lpLibraryList.lpActive')).toContainText(
            'Empty list with categories',
        );
        await expect(page.locator('.lpCategory')).toHaveCount(9);
        await expect(page.locator('.lpItem')).toHaveCount(0);
    });

    for (const [title, close] of [
        ['the close button', async (page) => page.getByRole('button', { name: 'Close' }).click()],
        ['a click outside', async (page) => page.mouse.click(5, 5)],
        ['the Escape key', async (page) => page.keyboard.press('Escape')],
    ] as const) {
        test(`${title} closes the picker without adding a list`, async ({ page }) => {
            const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
            await registerUser(
                page,
                `tplcls${now}`,
                'testtest',
                `tplcls+${now}@lighterpack.com`,
            );
            await expect(page.locator('.accountDropdownName')).toBeVisible();
            const listsBefore = await page.locator('#lists .lpLibraryList').count();

            await openTemplatePicker(page);
            await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
            await close(page);

            await expect(page.getByText('Start from a template')).toHaveCount(0);
            await expect(page.locator('#lists .lpLibraryList')).toHaveCount(listsBefore);
        });
    }
});
