import { ref, computed } from 'vue';
import store from '../store/store';

export function useGearRoomFilters() {
    const search = ref('');
    const filterCategory = ref('');
    const filterOrphan = ref(false);
    const filterStarred = ref(false);
    const weightMin = ref(null);
    const weightMax = ref(null);
    const filterList = ref('');
    const sortKey = ref('name');
    const sortAsc = ref(true);

    const library = computed(() => store.state.library);

    const allItems = computed(() => {
        void store.state.itemVersion;
        return library.value.items;
    });

    const orphanItemIds = computed(() => {
        const usedIds = new Set();
        for (const list of library.value.lists) {
            for (const catId of list.categoryIds) {
                const cat = library.value.getCategoryById(catId);
                if (!cat) continue;
                for (const ci of cat.categoryItems) usedIds.add(ci.itemId);
            }
        }
        return new Set(allItems.value.filter(i => !usedIds.has(i.id)).map(i => i.id));
    });

    const availableCategories = computed(() =>
        [...new Set(allItems.value.map(i => i.category).filter(Boolean))].sort()
    );

    const filteredItems = computed(() => {
        let items = allItems.value;
        if (search.value) {
            const q = search.value.toLowerCase();
            items = items.filter(i =>
                (i.name || '').toLowerCase().includes(q) ||
                (i.description || '').toLowerCase().includes(q) ||
                (i.brand || '').toLowerCase().includes(q)
            );
        }
        if (filterCategory.value) items = items.filter(i => i.category === filterCategory.value);
        if (filterOrphan.value) items = items.filter(i => orphanItemIds.value.has(i.id));
        if (filterStarred.value) items = items.filter(i => i.starred);
        if (filterList.value) {
            const list = library.value.lists.find(l => l.id === filterList.value);
            if (list) {
                const ids = new Set();
                for (const catId of list.categoryIds) {
                    const cat = library.value.getCategoryById(catId);
                    if (!cat) continue;
                    for (const ci of cat.categoryItems) ids.add(ci.itemId);
                }
                items = items.filter(i => ids.has(i.id));
            }
        }
        if (weightMin.value !== null && weightMin.value !== '') {
            items = items.filter(i => i.weight >= weightMin.value * 1000);
        }
        if (weightMax.value !== null && weightMax.value !== '') {
            items = items.filter(i => i.weight <= weightMax.value * 1000);
        }
        return items;
    });

    const sortedItems = computed(() => {
        const items = [...filteredItems.value];
        items.sort((a, b) => {
            let va, vb;
            if (sortKey.value === 'weight') { va = a.weight || 0; vb = b.weight || 0; }
            else if (sortKey.value === 'price') { va = a.price || 0; vb = b.price || 0; }
            else if (sortKey.value === 'starred') { va = a.starred ? 1 : 0; vb = b.starred ? 1 : 0; }
            else if (sortKey.value === 'category') { va = (a.category || '').toLowerCase(); vb = (b.category || '').toLowerCase(); }
            else { va = itemDisplayName(a).toLowerCase(); vb = itemDisplayName(b).toLowerCase(); }
            if (va < vb) return sortAsc.value ? -1 : 1;
            if (va > vb) return sortAsc.value ? 1 : -1;
            return 0;
        });
        return items;
    });

    const totalWeightDisplay = computed(() => {
        const totalMg = filteredItems.value.reduce((s, i) => s + (i.weight || 0), 0);
        const kg = totalMg / 1000000;
        return kg >= 1 ? kg.toFixed(2) + ' kg' : (totalMg / 1000).toFixed(0) + ' g';
    });

    const totalValue = computed(() =>
        filteredItems.value.reduce((s, i) => s + (i.price || 0), 0).toFixed(2).replace(/\.00$/, '')
    );

    const showTotalValue = computed(() => filteredItems.value.some(i => i.price > 0));

    const showPrice = computed(() => allItems.value.some(i => i.price > 0));

    function setSort(key) {
        if (sortKey.value === key) sortAsc.value = !sortAsc.value;
        else { sortKey.value = key; sortAsc.value = true; }
    }

    function itemDisplayName(item) {
        return [item.brand, item.name].filter(Boolean).join(' ');
    }

    return {
        search, filterCategory, filterOrphan, filterStarred,
        weightMin, weightMax, filterList, sortKey, sortAsc,
        library, allItems, orphanItemIds, availableCategories,
        filteredItems, sortedItems,
        totalWeightDisplay, totalValue, showTotalValue, showPrice,
        setSort, itemDisplayName,
    };
}
