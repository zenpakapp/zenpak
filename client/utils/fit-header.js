// Compact the editor header only when it is really short of room.
//
// Its items do not shrink: the list title absorbs the lack of space. When the title ends up
// narrower than MIN_TITLE_WIDTH the header is crowded (a long badge, the Wayfarer link, a long
// translation). Three steps, each only if the previous one was not enough:
//   `lpHeaderDense`      the publish badge becomes a dot;
//   `lpHeaderAvatarOnly` the account shows its avatar without the name;
//   `lpHeaderCompact`    Share and List settings drop their labels.
// Window-width breakpoints cannot tell: the room depends on the sidebar, the plan and the
// language, not only on the screen.
const MIN_TITLE_WIDTH = 120;
const DENSE_CLASS = 'lpHeaderDense';
const AVATAR_ONLY_CLASS = 'lpHeaderAvatarOnly';
const COMPACT_CLASS = 'lpHeaderCompact';

// Observers of each header, so they can be disconnected when it goes away.
const observers = new WeakMap();

function isCrowded(el) {
    const title = el.querySelector('.lpListTitleBlock');
    return Boolean(title) && title.getBoundingClientRect().width < MIN_TITLE_WIDTH;
}

function fitHeader(el) {
    // Measure with the full header, then step down. All in one go, so nothing is painted between.
    el.classList.remove(DENSE_CLASS, AVATAR_ONLY_CLASS, COMPACT_CLASS);
    const steps = [DENSE_CLASS, AVATAR_ONLY_CLASS, COMPACT_CLASS];
    steps.every((step) => {
        if (!isCrowded(el)) return false;
        el.classList.add(step);
        return true;
    });
}

export default {
    mounted(el) {
        const resizeObserver = new ResizeObserver(() => fitHeader(el));
        resizeObserver.observe(el);
        // Content changes (badge text, plan, language) do not resize the header itself.
        const mutationObserver = new MutationObserver(() => fitHeader(el));
        mutationObserver.observe(el, { childList: true, subtree: true, characterData: true });

        observers.set(el, { resizeObserver, mutationObserver });
        fitHeader(el);
    },
    beforeUnmount(el) {
        const entry = observers.get(el);
        if (!entry) return;
        entry.resizeObserver.disconnect();
        entry.mutationObserver.disconnect();
        observers.delete(el);
    },
};
