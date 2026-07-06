import { ref } from 'vue';
import { fetchJson } from '../utils/utils';

function kgToMg(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number * 1000000) : null;
}

export function useDiscover(options = {}) {
    const lists = ref([]);
    const nextCursor = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const hasMore = ref(false);
    const sort = ref(options.sort || 'recent');
    const query = ref('');
    const filters = ref({ season: '', type: '', minWeightKg: '', maxWeightKg: '' });
    const limit = ref(options.limit || 20);

    async function load(cursor = null) {
        loading.value = true;
        error.value = null;
        try {
            const params = new URLSearchParams({ sort: sort.value });
            params.set('limit', String(limit.value));
            if (cursor) params.set('cursor', cursor);
            if (query.value.trim()) params.set('q', query.value.trim());
            if (filters.value.season) params.set('season', filters.value.season);
            if (filters.value.type) params.set('type', filters.value.type);
            const minWeight = kgToMg(filters.value.minWeightKg);
            const maxWeight = kgToMg(filters.value.maxWeightKg);
            if (minWeight !== null) params.set('minWeight', String(minWeight));
            if (maxWeight !== null) params.set('maxWeight', String(maxWeight));
            const data = await fetchJson(`/api/community/discover?${params}`);
            if (cursor) {
                lists.value = [...lists.value, ...(data.lists || [])];
            } else {
                lists.value = data.lists || [];
            }
            nextCursor.value = data.nextCursor || null;
            hasMore.value = Boolean(data.nextCursor);
        } catch (err) {
            error.value = 'Unable to load lists.';
        } finally {
            loading.value = false;
        }
    }

    function loadMore() {
        if (nextCursor.value) load(nextCursor.value);
    }

    function setSort(value) {
        sort.value = value;
        query.value = '';
        nextCursor.value = null;
        lists.value = [];
        load();
    }

    function setQuery(value) {
        query.value = value;
        nextCursor.value = null;
        lists.value = [];
        load();
    }

    function setFilters(value) {
        filters.value = { ...filters.value, ...value };
        nextCursor.value = null;
        lists.value = [];
        load();
    }

    return { lists, loading, error, hasMore, sort, query, filters, setSort, setQuery, setFilters, load, loadMore };
}
