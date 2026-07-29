import { createApp, h } from 'vue';
import { createRouter, createWebHistory, RouterView } from 'vue-router';

import routes from './routes';
import { setPreviousRoute } from './composables/usePreviousRoute';
import { registerAppEventHandlers } from './services/app-events';
import { setRouter, redirect } from './services/navigation';
import { showGlobalAlert } from './services/user-feedback';
import { registerFocusDirectives } from './utils/focus';
import { initGlobalShortcuts } from './services/shortcuts';
import store from './store/store';
import { i18n, initLocale } from './i18n';

if (typeof window !== 'undefined') {
    window.history.scrollRestoration = 'manual';
}

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior() {
        return { top: 0 };
    },
});

setRouter(router);

router.onError((error, to) => {
    recoverRouteChunkError(error, to && to.fullPath);
});

function recoverRouteChunkError(error, targetPath) {
    const message = error && (error.message || String(error));
    const isLazyChunkError = /Cannot find module|Loading chunk|ChunkLoadError|dynamically imported module/i.test(message);
    if (!isLazyChunkError || typeof window === 'undefined') return;

    const retryPath = targetPath || `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const retryKey = `zp-route-retry:${retryPath}`;
    if (sessionStorage.getItem(retryKey)) return;

    sessionStorage.setItem(retryKey, '1');
    window.location.assign(retryPath);
}

function isPrivatePath(pathname) {
    return !isPublicPath(pathname) && !isUnknownRoute(pathname);
}

router.beforeEach(async (to, from) => {
    setPreviousRoute(from.path);

    if (isPrivatePath(to.path) && store.state.loggedIn && !store.state.library) {
        try {
            await store.dispatch('init');
        } catch (error) {
            showGlobalAlert(error);
            return '/welcome';
        }
        if (!store.state.library) return '/welcome';
    }

    return true;
});

const PUBLIC_PATHS = ['/welcome', '/forgot-password', '/reset-password', '/verify-email', '/community', '/guide', '/about'];

function isPublicPath(pathname) {
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith('/u/') || pathname.startsWith('/p/'));
}

function isUnknownRoute(pathname) {
    const resolved = router.resolve(pathname);
    return resolved.matched.length > 0 && resolved.matched[resolved.matched.length - 1].path === '/:pathMatch(.*)*';
}

registerAppEventHandlers({
    onUnauthorized(message) {
        if (message) {
            store.commit('pushGlobalAlert', { message });
        }
        if (!isPublicPath(window.location.pathname) && !isUnknownRoute(window.location.pathname)) {
            redirect('/welcome');
        }
    },
    onGlobalAlert(alert) {
        store.commit('pushGlobalAlert', alert);
    },
});

var initLighterPack = function () {
    const app = createApp({
        render() {
            return h(RouterView);
        },
    });

    app.use(router);
    app.use(store);
    app.use(i18n);
    registerFocusDirectives(app);
    initGlobalShortcuts();

    router.isReady()
        .catch((error) => {
            recoverRouteChunkError(error);
            throw error;
        })
        .then(() => initLocale())
        .then(() => {
            window.LighterPack = app.mount('#lp');
        })
        .catch((error) => {
            showGlobalAlert(error);
        });
};

initLighterPack();

const initAction = isPublicPath(window.location.pathname) || isUnknownRoute(window.location.pathname)
    ? 'initPublic'
    : 'init';

store.dispatch(initAction).catch((error) => {
    if (!store.state.library && isPrivatePath(window.location.pathname)) {
        router.push('/welcome');
    }
    showGlobalAlert(error);
});
