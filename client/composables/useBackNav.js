import { computed } from 'vue';
import { useStore } from 'vuex';
import { usePreviousRoute } from './usePreviousRoute';

export function useBackNav() {
    const { previousPath } = usePreviousRoute();
    const store = useStore();

    const backTo = computed(() => {
        if (previousPath.value?.startsWith('/community')) return '/community';
        if (previousPath.value?.startsWith('/p/')) return previousPath.value;
        return store.state.loggedIn ? '/' : '/welcome';
    });

    const backLabel = computed(() => {
        if (backTo.value === '/community') return '← Back to Community';
        if (backTo.value.startsWith('/p/')) return '← Back to list';
        return store.state.loggedIn ? '← Back to ZenPak' : 'Join ZenPak →';
    });

    return { backTo, backLabel };
}
