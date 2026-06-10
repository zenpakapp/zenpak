import { ref } from 'vue';
import { fetchJson } from '../utils/utils';

export function useDiscover() {
    const lists = ref([]);
    const nextCursor = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const hasMore = ref(false);
    const sort = ref('recent');

    async function load(cursor = null) {
        loading.value = true;
        error.value = null;
        try {
            const params = new URLSearchParams({ sort: sort.value });
            if (cursor) params.set('cursor', cursor);
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
        nextCursor.value = null;
        lists.value = [];
        load();
    }

    return { lists, loading, error, hasMore, sort, setSort, load, loadMore };
}
