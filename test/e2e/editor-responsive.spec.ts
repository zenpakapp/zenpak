import { test, expect } from '@playwright/test';

import { createEditorLibrary, mockSuccessfulEditorInitialization } from './editor-fixture';
import { testRoot } from './utils';

test.use({
    hasTouch: true,
});

for (const width of [320, 375, 768]) {
    test(`keeps the list editor usable at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 812 });
        const library = createEditorLibrary(12, 4);
        library.lists[0].name = 'Responsive editor list with a long title';
        library.categories[0].name = 'A long category name';
        library.items[0].name = 'A long item name that remains editable';

        await mockSuccessfulEditorInitialization(page, library);
        await page.goto(testRoot);
        await expect(page.locator('#main')).toBeVisible();

        const layout = await page.evaluate(() => {
            const list = document.querySelector('.lpList').getBoundingClientRect();
            const category = document.querySelector('.lpCategory').getBoundingClientRect();
            const item = document.querySelector('.lpItem').getBoundingClientRect();
            const edit = document.querySelector('.lpItem .lpEdit');
            const overflowingElements = [...document.querySelectorAll('body *')]
            .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                    element: `${element.tagName.toLowerCase()}#${element.id}.${element.className}`,
                    parent: `${element.parentElement?.tagName.toLowerCase()}#${element.parentElement?.id}.${element.parentElement?.className}`,
                    boxSizing: getComputedStyle(element).boxSizing,
                    computedLeft: getComputedStyle(element).left,
                    computedRight: getComputedStyle(element).right,
                    computedWidth: getComputedStyle(element).width,
                    left: Math.round(rect.left),
                    right: Math.round(rect.right),
                    scrollWidth: element.scrollWidth,
                    width: Math.round(rect.width),
                };
            })
            .filter(({ right }) => right > document.documentElement.clientWidth);
            const scrollingElements = [...document.querySelectorAll('body *')]
                .map((element) => ({
                    element: `${element.tagName.toLowerCase()}#${element.id}.${element.className}`,
                    clientWidth: element.clientWidth,
                    scrollWidth: element.scrollWidth,
                }))
                .filter(({ clientWidth, scrollWidth }) => scrollWidth > clientWidth)
                .sort((a, b) => (b.scrollWidth - b.clientWidth) - (a.scrollWidth - a.clientWidth))
                .slice(0, 12);

            return {
                viewportWidth: document.documentElement.clientWidth,
                documentWidth: document.documentElement.scrollWidth,
                listWidth: Math.round(list.width),
                categoryLeft: Math.round(category.left),
                categoryRight: Math.round(category.right),
                itemLeft: Math.round(item.left),
                itemRight: Math.round(item.right),
                editVisibility: getComputedStyle(edit).visibility,
                overflowingElements,
                scrollingElements,
            };
        });

        expect(layout.documentWidth, JSON.stringify({
            overflowingElements: layout.overflowingElements,
            scrollingElements: layout.scrollingElements,
        })).toBe(layout.viewportWidth);
        expect(layout.listWidth).toBeGreaterThanOrEqual(layout.viewportWidth - 1);
        expect(layout.categoryLeft).toBeGreaterThanOrEqual(0);
        expect(layout.categoryRight).toBeLessThanOrEqual(layout.viewportWidth);
        expect(layout.itemLeft).toBeGreaterThanOrEqual(0);
        expect(layout.itemRight).toBeLessThanOrEqual(layout.viewportWidth);
        expect(layout.editVisibility, JSON.stringify(layout)).toBe('visible');
        await expect(page.locator('.lpItem .lpRemove').first()).toBeVisible();
    });
}
