const dialogOpeners = {};
const dialogLoaders = {};
const dialogLoadPromises = {};

export function registerDialogOpener(name, opener) {
    dialogOpeners[name] = opener;
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

export async function openDialog(name, ...args) {
    if (!dialogOpeners[name]) {
        if (!dialogLoaders[name]) {
            throw new Error(`Dialog "${name}" is not initialized.`);
        }

        if (!dialogLoadPromises[name]) {
            dialogLoadPromises[name] = Promise.resolve(dialogLoaders[name]());
        }

        await dialogLoadPromises[name];

        if (!dialogOpeners[name]) {
            throw new Error(`Dialog "${name}" did not register an opener.`);
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
