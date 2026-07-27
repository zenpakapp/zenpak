const registry = new Map();

export function registerShortcut(combo, description, handler) {
    registry.set(combo, { description, handler });
}

export function unregisterShortcut(combo) {
    registry.delete(combo);
}

export function getRegistry() {
    return [...registry.entries()].map(([combo, { description }]) => ({ combo, description }));
}

function isInputActive() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export function initGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
        if (isInputActive()) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const match = registry.get(e.key.toLowerCase());
        if (match) {
            e.preventDefault();
            match.handler();
        }
    });
}
