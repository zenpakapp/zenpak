import { createStore } from 'vuex';
import debounce from 'lodash/debounce';
import { notifyGlobalAlert, notifyUnauthorized } from '../services/app-events';
import { getLocalLibrary, hasLocalLibrary, setLocalLibrary } from '../services/browser-storage';
import { fetchJson } from '../utils/utils';

const sessionMutations = require('./mutations-session');
const libraryMutations = require('./mutations-library');
const importMutations = require('./mutations-import');

const saveInterval = 10000;

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
});

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
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data) context.commit('setStripeConfigured', data.stripeEnabled); })
                .catch(() => {});
            return context.dispatch('loadRemote').catch((error) => {
                if (error && (error.statusCode === 401 || error.statusCode === 404)) {
                    if (hasLocalLibrary()) return context.dispatch('loadLocal');
                    context.commit('setLoggedIn', false);
                    context.commit('clearLibraryData');
                    return Promise.resolve();
                }
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
            const saveData = JSON.stringify(context.state.library.save());
            return fetchJson('/saveLibrary/', {
                method: 'POST',
                body: JSON.stringify({ syncToken: context.state.syncToken, username: context.state.loggedIn, data: saveData }),
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
            }).then((response) => {
                context.commit('setSyncToken', response.syncToken);
                context.commit('setLastSaveData', saveData);
            });
        },
        restoreFromBackup(context, libraryData) {
            context.commit('loadLibraryData', JSON.stringify(libraryData));
            context.commit('setSaveType', 'remote');
            const saveData = JSON.stringify(context.state.library.save());
            return fetchJson('/saveLibrary/', {
                method: 'POST',
                body: JSON.stringify({ syncToken: context.state.syncToken, username: context.state.loggedIn, data: saveData }),
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
            }).then((response) => {
                context.commit('setSyncToken', response.syncToken);
                context.commit('setLastSaveData', saveData);
            });
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
                try {
                    const billingRes = await fetch('/api/billing/me', { credentials: 'include' });
                    if (billingRes.ok) context.commit('setBilling', await billingRes.json());
                } catch (_) {}
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

                const saveRemotely = function (saveData) {
                    if (state.isSaving) {
                        setTimeout(() => { store.commit('save', true); }, saveInterval + 1);
                        return;
                    }
                    if (!saveData) saveData = JSON.stringify(state.library.save());
                    store.commit('setIsSaving', true);
                    store.commit('setLastSaveData', saveData);
                    return fetchJson('/saveLibrary/', {
                        method: 'POST',
                        body: JSON.stringify({ syncToken: state.syncToken, username: state.loggedIn, data: saveData }),
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                    })
                        .then((response) => {
                            store.commit('setSyncToken', response.syncToken);
                            store.commit('setIsSaving', false);
                        })
                        .catch((error) => {
                            store.commit('setIsSaving', false);
                            let errorMessage = 'An error occurred while attempting to save your data.';
                            if (error && error.message) errorMessage = error.message;
                            if (error && error.statusCode === 401) {
                                notifyUnauthorized(errorMessage);
                            } else {
                                notifyGlobalAlert({ message: errorMessage });
                            }
                        });
                };

                if (state.saveType === 'remote') saveRemotely(saveData);
                else if (state.saveType === 'local') setLocalLibrary(saveData);
            }, saveInterval, { maxWait: saveInterval * 3 }));
        },
    ],
});

export default store;
