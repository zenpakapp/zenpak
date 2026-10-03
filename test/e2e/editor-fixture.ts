import type { Page } from '@playwright/test';

export const LARGE_LIBRARY_ITEM_COUNT = 413;
export const LARGE_LIBRARY_ACTIVE_ITEM_COUNT = 40;

function createFixtureItem(index: number) {
    const itemNumber = index + 1;
    return {
        id: index + 3,
        name: `Fixture item ${String(itemNumber).padStart(3, '0')}`,
        description: `Deterministic description ${itemNumber}`,
        category: index % 2 === 0 ? 'Shelter' : 'Sleep',
        tags: index % 5 === 0 ? ['fixture'] : [],
        weight: itemNumber * 1000,
        authorUnit: 'g',
        price: itemNumber,
        image: '',
        imageUrl: '',
        url: '',
    };
}

export function createEditorLibrary(
    itemCount = LARGE_LIBRARY_ITEM_COUNT,
    activeItemCount = LARGE_LIBRARY_ACTIVE_ITEM_COUNT,
) {
    const items = Array.from({ length: itemCount }, (_, index) => createFixtureItem(index));
    const categoryItems = items.slice(0, activeItemCount).map(item => ({
        qty: 1,
        worn: 0,
        consumable: false,
        star: 0,
        itemId: item.id,
    }));

    return {
        version: '0.3',
        idMap: {},
        items,
        categories: [{
            id: 2,
            name: 'Active gear',
            categoryItems,
            subtotalWeight: 0,
            subtotalWornWeight: 0,
            subtotalConsumableWeight: 0,
            subtotalPrice: 0,
            subtotalConsumablePrice: 0,
            subtotalQty: activeItemCount,
        }],
        lists: [{
            id: 1,
            name: 'Deterministic profiling list',
            categoryIds: [2],
            chart: null,
            description: 'Synthetic browser fixture.',
            externalId: '',
            totalWeight: 0,
            totalWornWeight: 0,
            totalConsumableWeight: 0,
            totalBaseWeight: 0,
            totalPackWeight: 0,
            totalPrice: 0,
            totalConsumablePrice: 0,
            totalQty: activeItemCount,
        }],
        sequence: itemCount + 2,
        defaultListId: 1,
        totalUnit: 'g',
        itemUnit: 'g',
        showSidebar: true,
        showImages: false,
        optionalFields: {
            images: false,
            price: false,
            worn: true,
            consumable: true,
            listDescription: false,
        },
        currencySymbol: '$',
    };
}

export function createSigninPayload(library = createEditorLibrary()) {
    return {
        username: 'synthetic-profile',
        library: JSON.stringify(library),
        syncToken: 1,
        emailVerified: true,
    };
}

export async function mockEditorAncillaryRequests(page: Page) {
    await page.route('**/api/billing/config', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ stripeEnabled: false }),
    }));
    await page.route('**/api/billing/me', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
    }));
    await page.route('**/saveLibrary/**', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ syncToken: 2 }),
    }));
}

export async function mockSuccessfulEditorInitialization(
    page: Page,
    library = createEditorLibrary(),
) {
    await mockEditorAncillaryRequests(page);
    await page.route('**/signin', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createSigninPayload(library)),
    }));
}
