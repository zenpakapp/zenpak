import { ref } from 'vue';

let currentListId = null;

const isPackingMode = ref(false);
const packedItemIds = ref(new Set());

function storageKey(listId) {
    return `lp_packing_${listId}`;
}

function persist() {
    if (!currentListId) return;
    localStorage.setItem(storageKey(currentListId), JSON.stringify([...packedItemIds.value]));
}

function activate(listId, allItemIds) {
    currentListId = listId;
    const raw = localStorage.getItem(storageKey(listId));
    const saved = raw ? JSON.parse(raw) : [];
    const validSet = new Set(allItemIds);
    packedItemIds.value = new Set(saved.filter(id => validSet.has(id)));
    isPackingMode.value = true;
}

function deactivate() {
    isPackingMode.value = false;
    // state preserved in localStorage — not cleared
}

function toggleItem(itemId) {
    const next = new Set(packedItemIds.value);
    if (next.has(itemId)) {
        next.delete(itemId);
    } else {
        next.add(itemId);
    }
    packedItemIds.value = next;
    persist();
}

function reset() {
    packedItemIds.value = new Set();
    if (currentListId) {
        localStorage.removeItem(storageKey(currentListId));
    }
}

export function usePackingMode() {
    return { isPackingMode, packedItemIds, activate, deactivate, toggleItem, reset };
}
