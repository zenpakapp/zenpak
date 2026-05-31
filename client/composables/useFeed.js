import { ref } from 'vue';
import { fetchJson } from '../utils/utils';

export function useFeed() {
    const events = ref([]);
    const nextCursor = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const hasMore = ref(false);

    async function load(cursor = null) {
        loading.value = true;
        error.value = null;
        try {
            const url = cursor
                ? `/api/community/feed?cursor=${encodeURIComponent(cursor)}`
                : '/api/community/feed';
            const data = await fetchJson(url);
            if (cursor) {
                events.value = [...events.value, ...(data.events || [])];
            } else {
                events.value = data.events || [];
            }
            nextCursor.value = data.nextCursor || null;
            hasMore.value = Boolean(data.nextCursor);
        } catch (err) {
            error.value = 'Unable to load feed.';
        } finally {
            loading.value = false;
        }
    }

    function loadMore() {
        if (nextCursor.value) {
            load(nextCursor.value);
        }
    }

    return { events, loading, error, hasMore, load, loadMore };
}
