import { createStore } from 'vuex';
import { notifyGlobalAlert, notifyUnauthorized } from '../services/app-events';
import { getLocalLibrary, hasLocalLibrary, setLocalLibrary } from '../services/browser-storage';
import { fetchJson } from '../utils/utils';

const sessionMutations = require('./mutations-session');
const libraryMutations = require('./mutations-library');
const importMutations = require('./mutations-import');

const saveInterval = 10000;

function debounce(fn, wait, options = {}) {
    let timeout = null;
    let maxTimeout = null;
    let lastArgs = null;
    let lastContext = null;

    const clearTimers = () => {
        clearTimeout(timeout);
        clearTimeout(maxTimeout);
        timeout = null;
        maxTimeout = null;
    };

    return function debounced(...args) {
        lastArgs = args;
        lastContext = this;

        const invoke = () => {
            const currentArgs = lastArgs;
            const currentContext = lastContext;
            clearTimers();
            fn.apply(currentContext, currentArgs);
        };

        clearTimeout(timeout);
        timeout = setTimeout(invoke, wait);

        if (options.maxWait && !maxTimeout) {
            maxTimeout = setTimeout(invoke, options.maxWait);
        }
    };
}

const createInitialState = () => ({
    library: false,
    isSaving: false,
    syncToken: false,
    saveType: null,
    lastSaveData: null,
    loggedIn: false,
    emailVerified: null,
    globalAlerts: [],
    itemVersion: 0,
    categoryItemVersion: 0,
    gearRoomOpen: false,
    billing: null,
    stripeConfigured: null,
    initializationStatus: 'loading',
});

function waitUntilNotSaving(context) {
    if (!context.state.isSaving) return Promise.resolve();
    return new Promise((resolve) => {
        const unwatch = store.watch(
            (nextState) => nextState.isSaving,
            (isSaving) => {
                if (isSaving) return;
                unwatch();
                resolve();
            },
        );
    });
}

function postSave(context, saveData) {
    context.commit('setIsSaving', true);
    context.commit('setLastSaveData', saveData);

    return fetchJson('/saveLibrary/', {
        method: 'POST',
        body: JSON.stringify({ syncToken: context.state.syncToken, username: context.state.loggedIn, data: saveData }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
    })
        .then((response) => {
            context.commit('setSyncToken', response.syncToken);
            context.commit('setIsSaving', false);
        })
        .catch((error) => {
            context.commit('setIsSaving', false);
            throw error;
        });
}

const store = createStore({
    state: createInitialState,
    getters: {
        activeList(state) {
            return state.library.getListById(state.library.defaultListId);
        },
    },
    mutations: {
        ...sessionMutations,
        ...libraryMutations,
        ...importMutations,
    },
    actions: {
        init(context) {
            fetch('/api/billing/config')
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => { if (data) context.commit('setStripeConfigured', data.stripeEnabled); })
                .catch(() => {});
            return context.dispatch('loadRemote')
                .catch((error) => {
                    if (error && (error.statusCode === 401 || error.statusCode === 404)) {
                        if (hasLocalLibrary()) return context.dispatch('loadLocal');
                        context.commit('setLoggedIn', false);
                        context.commit('clearLibraryData');
                        return Promise.resolve();
                    }
                    return Promise.reject(error);
                })
                .then(() => {
                    context.commit('setInitializationStatus', 'ready');
                })
                .catch((error) => {
                    context.commit('setInitializationStatus', 'error');
                    return Promise.reject(error);
                });
        },
        initPublic(context) {
            fetch('/api/billing/config')
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => { if (data) context.commit('setStripeConfigured', data.stripeEnabled); })
                .catch(() => {});
            return fetchJson('/api/auth/me', { credentials: 'same-origin' })
                .then((response) => {
                    context.commit('setLoggedIn', response.username || false);
                    context.commit('setEmailVerified', response.emailVerified ?? null);
                    context.commit('setInitializationStatus', 'ready');
                })
                .catch((error) => {
                    if (error && (error.statusCode === 401 || error.statusCode === 404)) {
                        context.commit('setLoggedIn', false);
                        context.commit('setInitializationStatus', 'ready');
                        return Promise.resolve();
                    }
                    context.commit('setInitializationStatus', 'error');
                    return Promise.reject(error);
                });
        },
        loadLocal(context) {
            const libraryData = getLocalLibrary();
            context.commit('loadLibraryData', libraryData);
            context.commit('setSaveType', 'local');
            context.commit('setLoggedIn', false);
        },
        saveRemoteWithTemplate(context, templateData) {
            context.commit('loadLibraryData', JSON.stringify(templateData));
            context.commit('setSaveType', 'remote');
            return waitUntilNotSaving(context)
                .then(() => postSave(context, JSON.stringify(context.state.library.save())));
        },
        restoreFromBackup(context, libraryData) {
            context.commit('loadLibraryData', JSON.stringify(libraryData));
            context.commit('setSaveType', 'remote');
            return waitUntilNotSaving(context)
                .then(() => postSave(context, JSON.stringify(context.state.library.save())));
        },
        saveNow(context) {
            const state = context.state;
            if (!state.library) return Promise.resolve();
            const saveData = JSON.stringify(state.library.save());

            if (saveData === state.lastSaveData) return Promise.resolve();

            if (state.saveType === 'local') {
                setLocalLibrary(saveData);
                context.commit('setLastSaveData', saveData);
                return Promise.resolve();
            }

            if (state.saveType !== 'remote' || !state.loggedIn) return Promise.resolve();

            if (state.isSaving) {
                return waitUntilNotSaving(context).then(() => context.dispatch('saveNow'));
            }

            return postSave(context, saveData);
        },
        async loadRemote(context) {
            try {
                const response = await fetchJson('/signin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                });
                context.commit('setSyncToken', response.syncToken);
                context.commit('loadLibraryData', response.library);
                context.commit('setSaveType', 'remote');
                context.commit('setLoggedIn', response.username);
                context.commit('setEmailVerified', response.emailVerified ?? null);
                fetch('/api/billing/me', { credentials: 'include' })
                    .then((res) => (res.ok ? res.json() : null))
                    .then((data) => { if (data) context.commit('setBilling', data); })
                    .catch(() => {});
            } catch (error) {
                if (error && error.statusCode === 401) notifyUnauthorized(error.message);
                return Promise.reject(error);
            }
        },
    },
    plugins: [
        function save(store) {
            store.subscribe(debounce((mutation, state) => {
                const ignore = [
                    'setIsSaving', 'setSaveType', 'setSyncToken', 'setLastSaveData',
                    'signout', 'setLoggedIn', 'loadLibraryData', 'clearLibraryData',
                ];
                if (!state.library || ignore.indexOf(mutation.type) > -1) return;

                const saveData = JSON.stringify(state.library.save());
                if (saveData == state.lastSaveData) return;

                if (state.saveType === 'remote') {
                    store.dispatch('saveNow').catch((error) => {
                        let errorMessage = 'An error occurred while attempting to save your data.';
                        if (error && error.message) errorMessage = error.message;
                        if (error && error.statusCode === 401) {
                            notifyUnauthorized(errorMessage);
                        } else {
                            notifyGlobalAlert({ message: errorMessage });
                        }
                    });
                } else if (state.saveType === 'local') {
                    setLocalLibrary(saveData);
                }
            }, saveInterval, { maxWait: saveInterval * 3 }));
        },
    ],
});

export default store;
