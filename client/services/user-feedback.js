import { notifyGlobalAlert } from './app-events';

let lastAlertKey = '';
let lastAlertAt = 0;

function getAlertKey(message) {
    if (message && message.key) return `key:${message.key}:${JSON.stringify(message.params || {})}`;
    if (message && message.message) return `message:${message.message}`;
    return `message:${message}`;
}

// options.action = { label, handler }: a button in the alert (the undo of a removal).
export function showGlobalAlert(message, options = {}) {
    if (!message) {
        return;
    }

    const key = getAlertKey(message);
    const now = Date.now();
    if (key === lastAlertKey && now - lastAlertAt < 1000) return;
    lastAlertKey = key;
    lastAlertAt = now;

    notifyGlobalAlert({ message, ...options });
}

export default {
    showGlobalAlert,
};
