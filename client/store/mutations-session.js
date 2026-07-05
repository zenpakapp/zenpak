const { clearCookie } = require('../services/browser-storage');
const dataTypes = require('../dataTypes.js');
const Library = dataTypes.Library;

module.exports = {
    pushGlobalAlert(state, alert) {
        const message = alert && alert.message ? alert.message : alert;
        if (!message) return;
        state.globalAlerts.push({ id: `${Date.now()}-${Math.random()}`, message });
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
            state.globalAlerts.push({
                id: `${Date.now()}-${Math.random()}`,
                message: 'An error occurred while loading your data.',
            });
        }
        state.library = library;
        state.lastSaveData = JSON.stringify(library.save());
    },
    clearLibraryData(state) { state.library = false; },
    toggleSidebar(state) { state.library.showSidebar = !state.library.showSidebar; },
    setGearRoomOpen(state, open) { state.gearRoomOpen = open; },
    setBilling(state, billing) { state.billing = billing; },
    setStripeConfigured(state, val) { state.stripeConfigured = val; },
};
