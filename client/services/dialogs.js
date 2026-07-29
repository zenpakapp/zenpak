const dialogOpeners = {};
const dialogLoaders = {};
const dialogLoadPromises = {};
const dialogOpenerWaiters = {};

export function registerDialogOpener(name, opener) {
    dialogOpeners[name] = opener;
    if (dialogOpenerWaiters[name]) {
        dialogOpenerWaiters[name].forEach(resolve => resolve(opener));
        delete dialogOpenerWaiters[name];
    }
}

export function registerDialogLoader(name, loader) {
    dialogLoaders[name] = loader;
}

export function unregisterDialogLoader(name, loader) {
    if (!name) {
        return;
    }

    if (!loader || dialogLoaders[name] === loader) {
        delete dialogLoaders[name];
        delete dialogLoadPromises[name];
    }
}

export function unregisterDialogOpener(name, opener) {
    if (!name) {
        return;
    }

    if (!opener || dialogOpeners[name] === opener) {
        delete dialogOpeners[name];
    }
}

function waitForDialogOpener(name) {
    if (dialogOpeners[name]) {
        return Promise.resolve(dialogOpeners[name]);
    }

    return new Promise((resolve, reject) => {
        if (!dialogOpenerWaiters[name]) {
            dialogOpenerWaiters[name] = [];
        }
        dialogOpenerWaiters[name].push(resolve);
        setTimeout(() => {
            const waiters = dialogOpenerWaiters[name];
            if (!waiters) return;
            dialogOpenerWaiters[name] = waiters.filter(waiter => waiter !== resolve);
            if (!dialogOpenerWaiters[name].length) {
                delete dialogOpenerWaiters[name];
            }
            reject(new Error(`Dialog "${name}" did not register an opener.`));
        }, 2000);
    });
}

export async function openDialog(name, ...args) {
    if (!dialogOpeners[name]) {
        if (!dialogLoaders[name]) {
            throw new Error(`Dialog "${name}" is not initialized.`);
        }

        if (!dialogLoadPromises[name]) {
            dialogLoadPromises[name] = Promise.resolve(dialogLoaders[name]());
        }

        try {
            await dialogLoadPromises[name];
        } catch (error) {
            delete dialogLoadPromises[name];
            throw error;
        }

        if (!dialogOpeners[name]) {
            await waitForDialogOpener(name).catch((error) => {
                delete dialogLoadPromises[name];
                throw error;
            });
        }
    }

    dialogOpeners[name](...args);
}

export default {
    registerDialogOpener,
    registerDialogLoader,
    unregisterDialogLoader,
    unregisterDialogOpener,
    openDialog,
};
