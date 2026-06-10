import { ref } from 'vue';
import { fetchJson } from '../utils/utils';

export function useCopyList(router) {
    const copying = ref(false);
    const error = ref(null);

    async function copyList(externalId) {
        copying.value = true;
        error.value = null;
        try {
            const data = await fetchJson(`/api/community/copy-list/${externalId}`, { method: 'POST' });
            router.push(`/?list=${data.listId}`);
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
