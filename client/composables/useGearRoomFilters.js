import {
    ref, computed, watch, onBeforeUnmount,
} from 'vue';
import store from '../store/store';

function itemDisplayName(item) {
    return [item.brand, item.name].filter(Boolean).join(' ');
}

function buildListItemIds(library, list) {
    const ids = new Set();
    list.categoryIds.forEach((catId) => {
        const cat = library.getCategoryById(catId);
        if (!cat) return;
        cat.categoryItems.forEach((ci) => ids.add(ci.itemId));
    });
    return ids;
}

function sortValue(item, key) {
    if (key === 'weight') return item.weight || 0;
    if (key === 'price') return item.price || 0;
    if (key === 'starred') return item.starred ? 1 : 0;
    if (key === 'category') return (item.category || '').toLowerCase();
    return itemDisplayName(item).toLowerCase();
}

export default function useGearRoomFilters() {
    const search = ref('');
    const searchDraft = ref('');
    const filterCategory = ref('');
    const filterOrphan = ref(false);
    const filterStarred = ref(false);
    const weightMin = ref(null);
    const weightMax = ref(null);
    const filterList = ref('');
    const sortKey = ref('name');
    const sortAsc = ref(true);
    let searchFrame = null;

    const library = computed(() => store.state.library);

    const allItems = computed(() => {
        const itemVersion = store.state.itemVersion;
        if (itemVersion < 0) return [];
        return library.value.items;
    });

    const orphanItemIds = computed(() => {
        const usedIds = new Set();
        library.value.lists.forEach((list) => {
            buildListItemIds(library.value, list).forEach((id) => usedIds.add(id));
        });
        return new Set(allItems.value.filter((i) => !usedIds.has(i.id)).map((i) => i.id));
    });

    const availableCategories = computed(() => [...new Set(allItems.value.map((i) => i.category).filter(Boolean))].sort());

    const filteredItems = computed(() => {
        let items = allItems.value;
        if (search.value) {
            const q = search.value.toLowerCase();
            items = items.filter((i) => (i.name || '').toLowerCase().includes(q)
                || (i.description || '').toLowerCase().includes(q)
                || (i.brand || '').toLowerCase().includes(q));
        }
        if (filterCategory.value) items = items.filter((i) => i.category === filterCategory.value);
        if (filterOrphan.value) items = items.filter((i) => orphanItemIds.value.has(i.id));
        if (filterStarred.value) items = items.filter((i) => i.starred);
        if (filterList.value) {
            const list = library.value.lists.find((l) => l.id === filterList.value);
            if (list) {
                const ids = buildListItemIds(library.value, list);
                items = items.filter((i) => ids.has(i.id));
            }
        }
        if (weightMin.value !== null && weightMin.value !== '') {
            items = items.filter((i) => i.weight >= weightMin.value * 1000);
        }
        if (weightMax.value !== null && weightMax.value !== '') {
            items = items.filter((i) => i.weight <= weightMax.value * 1000);
        }
        return items;
    });

    const sortedItems = computed(() => {
        const items = [...filteredItems.value];
        items.sort((a, b) => {
            const va = sortValue(a, sortKey.value);
            const vb = sortValue(b, sortKey.value);
            if (va < vb) return sortAsc.value ? -1 : 1;
            if (va > vb) return sortAsc.value ? 1 : -1;
            return 0;
        });
        return items;
    });

    const totalWeightDisplay = computed(() => {
        const totalMg = filteredItems.value.reduce((s, i) => s + (i.weight || 0), 0);
        const kg = totalMg / 1000000;
        return kg >= 1 ? `${kg.toFixed(2)} kg` : `${(totalMg / 1000).toFixed(0)} g`;
    });

    const totalValue = computed(() => filteredItems.value.reduce((s, i) => s + (i.price || 0), 0).toFixed(2).replace(/\.00$/, ''));

    const showTotalValue = computed(() => filteredItems.value.some((i) => i.price > 0));

    const showPrice = computed(() => allItems.value.some((i) => i.price > 0));

    function setSort(key) {
        if (sortKey.value === key) sortAsc.value = !sortAsc.value;
        else { sortKey.value = key; sortAsc.value = true; }
    }

    function flushSearch() {
        searchFrame = null;
        search.value = searchDraft.value;
    }

    watch(searchDraft, () => {
        if (searchFrame !== null && typeof window !== 'undefined') {
            window.cancelAnimationFrame(searchFrame);
        }
        if (typeof window === 'undefined') {
            flushSearch();
            return;
        }
        searchFrame = window.requestAnimationFrame(flushSearch);
    });

    onBeforeUnmount(() => {
        if (searchFrame !== null && typeof window !== 'undefined') {
            window.cancelAnimationFrame(searchFrame);
        }
    });

    return {
        search,
        searchDraft,
        filterCategory,
        filterOrphan,
        filterStarred,
        weightMin,
        weightMax,
        filterList,
        sortKey,
        sortAsc,
        library,
        allItems,
        orphanItemIds,
        availableCategories,
        filteredItems,
        sortedItems,
        totalWeightDisplay,
        totalValue,
        showTotalValue,
        showPrice,
        setSort,
        itemDisplayName,
    };
}
