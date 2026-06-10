import { ref } from 'vue';
import { fetchJson } from '../utils/utils';
import store from '../store/store';

export function useCopyList(router) {
    const copying = ref(false);
    const error = ref(null);

    async function copyList(externalId) {
        copying.value = true;
        error.value = null;
        try {
            const data = await fetchJson(`/api/community/copy-list/${externalId}`, { method: 'POST' });
            // Import into local library with dedup — auto-saved by store subscriber
            store.commit('importPublicList', data);
            router.push('/');
        } catch (err) {
            if (err && err.status === 403) {
                error.value = 'Cannot copy your own list.';
            } else if (err && err.status === 404) {
                error.value = 'List no longer available.';
            } else {
                error.value = 'Unable to copy list. Please try again.';
            }
        } finally {
            copying.value = false;
        }
    }

    return { copying, error, copyList };
}
