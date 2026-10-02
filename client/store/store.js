import { createStore } from 'vuex';
import { notifyGlobalAlert, notifyUnauthorized } from '../services/app-events';
import { getLocalLibrary, hasLocalLibrary, setLocalLibrary } from '../services/browser-storage';
import { fetchJson } from '../utils/utils';

const sessionMutations = require('./mutations-session');
const libraryMutations = require('./mutations-library');
const importMutations = require('./mutations-import');
const { getSaveData } = require('../services/save-data.js');

const saveInterval = 2000;
// Keepalive request bodies are capped at 64 KB by browsers; larger libraries use a normal fetch.
const KEEPALIVE_MAX_BYTES = 60000;

const SAVE_IGNORED_MUTATIONS = [
    'setIsSaving', 'setSaveType', 'setSyncToken', 'setLastSaveData',
    'signout', 'setLoggedIn', 'loadLibraryData', 'clearLibraryData',
    'markPendingSave', 'clearPendingSave',
];

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
    hasPendingSave: false,
    pendingChangeSeq: 0,
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

function postSave(context, saveData, { keepalive = false } = {}) {
    const seq = context.state.pendingChangeSeq;
    context.commit('setIsSaving', true);
    context.commit('setLastSaveData', saveData);

    return fetchJson('/saveLibrary/', {
        method: 'POST',
        body: JSON.stringify({ syncToken: context.state.syncToken, username: context.state.loggedIn, data: saveData }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: keepalive && saveData.length < KEEPALIVE_MAX_BYTES,
    })
        .then((response) => {
            context.commit('setSyncToken', response.syncToken);
            context.commit('setIsSaving', false);
            context.commit('clearPendingSave', seq);
        })
        .catch((error) => {
            context.commit('setIsSaving', false);
            throw error;
        });
}

function waitUntilNotSaving(context) {
    if (!context.state.isSaving) return Promise.resolve();
    return new Promise((resolve) => {
        const check = () => {
            if (!context.state.isSaving) {
                resolve();
                return;
            }
            setTimeout(check, 50);
        };
        check();
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
        saveNow(context, preparedSaveData) {
            const state = context.state;
            if (!state.library) return Promise.resolve();
            const saveData = getSaveData(state, preparedSaveData);

            if (saveData === state.lastSaveData) {
                context.commit('clearPendingSave', state.pendingChangeSeq);
                return Promise.resolve();
            }

            if (state.saveType === 'local') {
                setLocalLibrary(saveData);
                context.commit('setLastSaveData', saveData);
                context.commit('clearPendingSave', state.pendingChangeSeq);
                return Promise.resolve();
            }

            if (state.saveType !== 'remote' || !state.loggedIn) return Promise.resolve();

            if (state.isSaving) {
                return waitUntilNotSaving(context).then(() => context.dispatch('saveNow'));
            }

            return postSave(context, saveData);
        },
        // Save immediately when the page is being hidden or left, so an edit made
        // just before a reload or tab close is not lost to the autosave debounce.
        flushSave(context) {
            const state = context.state;
            if (!state.hasPendingSave || !state.library) return Promise.resolve();
            if (state.saveType !== 'remote' || !state.loggedIn) return context.dispatch('saveNow');

            const saveData = getSaveData(state);
            if (saveData === state.lastSaveData) {
                context.commit('clearPendingSave', state.pendingChangeSeq);
                return Promise.resolve();
            }
            return waitUntilNotSaving(context).then(() => postSave(context, saveData, { keepalive: true }));
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
            store.subscribe((mutation, state) => {
                if (!state.library || SAVE_IGNORED_MUTATIONS.includes(mutation.type)) return;
                store.commit('markPendingSave');
            });

            if (typeof window !== 'undefined') {
                const flush = () => { store.dispatch('flushSave').catch(() => {}); };
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'hidden') flush();
                });
                window.addEventListener('pagehide', flush);
            }

            store.subscribe(debounce((mutation, state) => {
                if (!state.library || SAVE_IGNORED_MUTATIONS.includes(mutation.type)) return;

                const saveData = JSON.stringify(state.library.save());
                if (saveData === state.lastSaveData) {
                    store.commit('clearPendingSave', state.pendingChangeSeq);
                    return;
                }

                if (state.saveType === 'remote') {
                    store.dispatch('saveNow', saveData).catch((error) => {
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
                    store.commit('setLastSaveData', saveData);
                    store.commit('clearPendingSave', state.pendingChangeSeq);
                }
            }, saveInterval, { maxWait: saveInterval * 3 }));
        },
    ],
});

export default store;
