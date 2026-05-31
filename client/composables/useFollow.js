import { ref } from 'vue';
import { fetchJson } from '../utils/utils';

export function useFollow(username) {
    const following = ref(false);
    const mode = ref('all');
    const loading = ref(false);

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
        try {
            const data = await fetchJson(`/api/community/follow/${username}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: selectedMode }),
            });
            following.value = data.following;
            mode.value = data.mode;
        } finally {
            loading.value = false;
        }
    }

    async function unfollow() {
        loading.value = true;
        try {
            await fetchJson(`/api/community/follow/${username}`, { method: 'DELETE' });
            following.value = false;
            mode.value = null;
        } finally {
            loading.value = false;
        }
    }

    return { following, mode, loading, loadStatus, follow, unfollow };
}
