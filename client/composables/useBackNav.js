import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { i18n } from '../i18n';
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

    const backLabel = computed(() => {
        if (!store.state.loggedIn) return i18n.global.t('public.joinZenPak');
        if (backTo.value === '/community') return i18n.global.t('public.backToCommunity');
        if (backTo.value.startsWith('/p/')) return i18n.global.t('public.backToList');
        return i18n.global.t('public.backToZenPak');
    });

    return { backTo, backLabel };
}
