let activeSpeedbumpOpener = null;
let speedbumpLoader = null;
let speedbumpLoadPromise = null;

export function setSpeedbumpOpener(opener) {
    activeSpeedbumpOpener = opener;
}

export function setSpeedbumpLoader(loader) {
    speedbumpLoader = loader;
}

export function clearSpeedbumpLoader(loader) {
    if (!loader || speedbumpLoader === loader) {
        speedbumpLoader = null;
        speedbumpLoadPromise = null;
    }
}

export function clearSpeedbumpOpener(opener) {
    if (!opener || activeSpeedbumpOpener === opener) {
        activeSpeedbumpOpener = null;
    }
}

export async function openSpeedbump(callback, options) {
    if (!activeSpeedbumpOpener) {
        if (!speedbumpLoader) {
            throw new Error('Speedbump is not initialized.');
        }
        if (!speedbumpLoadPromise) {
            speedbumpLoadPromise = Promise.resolve(speedbumpLoader());
        }
        await speedbumpLoadPromise;
    }

    if (!activeSpeedbumpOpener) {
        throw new Error('Speedbump did not register an opener.');
    }

    activeSpeedbumpOpener(callback, options);
}

export default {
    setSpeedbumpLoader,
    setSpeedbumpOpener,
    clearSpeedbumpLoader,
    clearSpeedbumpOpener,
    openSpeedbump,
};
