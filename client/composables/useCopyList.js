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
            if (!store.state.library && store.state.loggedIn) {
                await store.dispatch('loadRemote');
            }
            const data = await fetchJson(`/api/community/copy-list/${externalId}`, { method: 'POST' });
            // Import into local library with dedup — auto-saved by store subscriber
            store.commit('importPublicList', data);
            router.push('/');
        } catch (err) {
            if (err && err.status === 403 && err.message === 'Cannot copy your own list') {
                error.value = 'public.copyOwnList';
            } else if (err && err.status === 404) {
                error.value = 'public.copyListUnavailable';
            } else if (err && err.status === 429) {
                error.value = {
                    key: 'public.copyRateLimited',
                    params: {
                        limit: err.limit || 5,
                        minutes: err.retryAfterMinutes || 60,
                    },
                };
            } else {
                error.value = 'public.copyListFailed';
            }
        } finally {
            copying.value = false;
        }
    }

    return { copying, error, copyList };
}
