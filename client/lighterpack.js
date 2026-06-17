import { createApp, h } from 'vue';
import { createRouter, createWebHistory, RouterView } from 'vue-router';

import routes from './routes';
import { setPreviousRoute } from './composables/usePreviousRoute';
import { registerAppEventHandlers } from './services/app-events';
import { setRouter, redirect } from './services/navigation';
import { showGlobalAlert } from './services/user-feedback';
import { registerFocusDirectives } from './utils/focus';
import store from './store/store';

const router = createRouter({
    history: createWebHistory(),
    routes,
});

setRouter(router);

router.beforeEach((to, from) => {
    setPreviousRoute(from.path);
});

const PUBLIC_PATHS = ['/welcome', '/forgot-password', '/reset-password', '/community', '/guide', '/about'];

function isPublicPath(pathname) {
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith('/u/') || pathname.startsWith('/p/'));
}

registerAppEventHandlers({
    onUnauthorized(message) {
        if (message) {
            store.commit('pushGlobalAlert', { message });
        }
        if (!isPublicPath(window.location.pathname)) {
            redirect('/welcome');
        }
    },
    onGlobalAlert(alert) {
        store.commit('pushGlobalAlert', alert);
    },
});

store.dispatch('init')
    .then(() => {
        initLighterPack();
    })
    .catch((error) => {
        if (!store.state.library && !isPublicPath(window.location.pathname)) {
            router.push('/welcome');
        }
        showGlobalAlert(error);
        initLighterPack();
    });

var initLighterPack = function () {
    const app = createApp({
        render() {
            return h(RouterView);
        },
    });

    app.use(router);
    app.use(store);
    registerFocusDirectives(app);

    router.isReady().then(() => {
        window.LighterPack = app.mount('#lp');
    });
};
