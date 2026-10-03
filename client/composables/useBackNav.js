import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { usePreviousRoute } from './usePreviousRoute';

export function useBackNav() {
    const { previousPath } = usePreviousRoute();
    const store = useStore();
    const route = useRoute();

    const backTo = computed(() => {
        if (!store.state.loggedIn) return '/welcome';
        if (route.query.from === 'community') return '/community';
        if (previousPath.value?.startsWith('/community')) return '/community';
        if (previousPath.value?.startsWith('/p/')) return previousPath.value;
        return '/';
    });

    const backLabelKey = computed(() => {
        if (!store.state.loggedIn) return 'public.joinZenPak';
        if (backTo.value === '/community') return 'public.backToCommunity';
        if (backTo.value.startsWith('/p/')) return 'public.backToList';
        return 'public.backToZenPak';
    });

    return { backTo, backLabelKey };
}
