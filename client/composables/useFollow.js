import { ref } from 'vue';
import { fetchJson } from '../utils/utils';

export function useFollow(username) {
    const following = ref(false);
    const mode = ref('all');
    const loading = ref(false);
    const error = ref(null);

    async function loadStatus() {
        try {
            const data = await fetchJson(`/api/community/follow-status/${username}`);
            following.value = data.following;
            mode.value = data.mode || 'all';
        } catch (err) {
            // not authenticated — stay at defaults
        }
    }

    async function follow(selectedMode = 'all') {
        loading.value = true;
        error.value = null;
        try {
            const data = await fetchJson(`/api/community/follow/${username}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: selectedMode }),
            });
            following.value = data.following;
            mode.value = data.mode;
        } catch (err) {
            error.value = 'Unable to follow user.';
        } finally {
            loading.value = false;
        }
    }

    async function unfollow() {
        loading.value = true;
        error.value = null;
        try {
            await fetchJson(`/api/community/follow/${username}`, { method: 'DELETE' });
            following.value = false;
            mode.value = 'all';
        } catch (err) {
            error.value = 'Unable to unfollow user.';
        } finally {
            loading.value = false;
        }
    }

    return { following, mode, loading, error, loadStatus, follow, unfollow };
}
