import { computed } from 'vue';
import { usePreviousRoute } from './usePreviousRoute';

export function useBackNav() {
    const { previousPath } = usePreviousRoute();

    const backTo = computed(() =>
        previousPath.value && previousPath.value.startsWith('/community')
            ? '/community'
            : '/'
    );

    const backLabel = computed(() =>
        backTo.value === '/community' ? '← Back to Community' : '← Back to ZenPak'
    );

    return { backTo, backLabel };
}
