const { clearCookie } = require('../services/browser-storage');
const dataTypes = require('../dataTypes.js');
const Library = dataTypes.Library;

function alertKey(alert) {
    if (!alert) return '';
    if (alert.key) return `key:${alert.key}:${JSON.stringify(alert.params || {})}`;
    const message = alert.message && alert.message.message ? alert.message.message : alert.message;
    return message ? `message:${message}` : '';
}

function pushGlobalAlert(state, alert) {
    const key = alertKey(alert);
    if (!key) return;

    const existingIndex = state.globalAlerts.findIndex(existing => alertKey(existing) === key);
    const nextAlert = {
        id: existingIndex >= 0 ? state.globalAlerts[existingIndex].id : `${Date.now()}-${Math.random()}`,
        ...(typeof alert === 'string' ? { message: alert } : alert),
    };

    if (existingIndex >= 0) state.globalAlerts.splice(existingIndex, 1, nextAlert);
    else state.globalAlerts.push(nextAlert);
}

module.exports = {
    pushGlobalAlert(state, alert) {
        pushGlobalAlert(state, alert);
    },
    removeGlobalAlert(state, alertId) {
        state.globalAlerts = state.globalAlerts.filter((alert) => alert.id !== alertId);
    },
    setSaveType(state, saveType) { state.saveType = saveType; },
    setSyncToken(state, syncToken) { state.syncToken = syncToken; },
    setLastSaveData(state, lastSaveData) { state.lastSaveData = lastSaveData; },
    setIsSaving(state, isSaving) { state.isSaving = isSaving; },
    signout(state) {
        clearCookie('lp');
        fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
        state.library = false;
        state.loggedIn = false;
    },
    setLoggedIn(state, loggedIn) { state.loggedIn = loggedIn; },
    setEmailVerified(state, emailVerified) { state.emailVerified = emailVerified; },
    loadLibraryData(state, libraryData) {
        const library = new Library();
        try {
            libraryData = JSON.parse(libraryData);
            library.load(libraryData);
        } catch (err) {
            pushGlobalAlert(state, {
                message: 'An error occurred while loading your data.',
            });
        }
        state.library = library;
        state.lastSaveData = JSON.stringify(library.save());
    },
    clearLibraryData(state) { state.library = false; },
    toggleSidebar(state) { state.library.showSidebar = !state.library.showSidebar; },
    setSidebarOpen(state, open) { state.library.showSidebar = open; },
    setGearRoomOpen(state, open) { state.gearRoomOpen = open; },
    setBilling(state, billing) { state.billing = billing; },
    setStripeConfigured(state, val) { state.stripeConfigured = val; },
    setInitializationStatus(state, status) { state.initializationStatus = status; },
};
