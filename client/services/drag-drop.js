let dragulaPromise = null;

async function loadDragula() {
    if (!dragulaPromise) {
        dragulaPromise = import(/* webpackChunkName: "vendor-dragula" */ 'dragula')
            .then((module) => module.default || module);
    }
    return dragulaPromise;
}

export async function createDragDrop(containers, options) {
    const dragula = await loadDragula();
    return dragula(containers.filter(Boolean), options);
}

export function queryContainers(root, selector) {
    if (!root) {
        return [];
    }

    return Array.from(root.querySelectorAll(selector));
}

export function getDatasetInt(element, key) {
    if (!element || !element.dataset || typeof element.dataset[key] === 'undefined') {
        return null;
    }

    const value = parseInt(element.dataset[key], 10);
    return Number.isNaN(value) ? null : value;
}
