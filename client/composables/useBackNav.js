import { computed } from 'vue';
import { useStore } from 'vuex';
import { usePreviousRoute } from './usePreviousRoute';

export function useBackNav() {
    const { previousPath } = usePreviousRoute();
    const store = useStore();

    const backTo = computed(() => {
        if (!store.state.loggedIn) return '/welcome';
        if (previousPath.value?.startsWith('/community')) return '/community';
        if (previousPath.value?.startsWith('/p/')) return previousPath.value;
        return '/';
    });

    const backLabel = computed(() => {
        if (!store.state.loggedIn) return 'Join ZenPak →';
        if (backTo.value === '/community') return '← Back to Community';
        if (backTo.value.startsWith('/p/')) return '← Back to list';
        return '← Back to ZenPak';
    });

    return { backTo, backLabel };
}
