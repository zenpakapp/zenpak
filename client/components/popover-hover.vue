<style lang="scss">
@import "../css/_globals";

</style>

<template>
    <Popover
        :shown="shown"
        :placement="placement"
        :focusable="focusable"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
        @click="onClick"
        @focusin="onFocusIn"
        @focusout="onFocusOut"
        @toggle="toggle"
        @hide="onOutside"
    >
        <template #target>
            <slot name="target" />
        </template>
        <template #content>
            <slot name="content" />
        </template>
    </Popover>
</template>

<script>
import Popover from './popover.vue';

export default {
    name: 'PopoverHover',
    components: {
        Popover,
    },
    props: {
        placement: {
            type: String,
            default: 'center',
        },
        // 'hover' opens on pointer or keyboard focus; 'click' opens only on click, Enter or Space
        // and stays open until Escape, a click outside, or the trigger again.
        trigger: {
            type: String,
            default: 'hover',
        },
        // The trigger takes keyboard focus. Leave it off when the target already is a control.
        focusable: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            shown: false,
            hideTimeout: null,
            returningFocus: false,
        };
    },
    methods: {
        onMouseEnter() {
            if (this.trigger === 'hover') this.show();
        },
        onMouseLeave() {
            if (this.trigger === 'hover') this.startHideTimeout();
        },
        onClick(evt) {
            if (this.trigger === 'click' && evt.target.closest('.lpTarget')) this.toggle();
        },
        onFocusIn() {
            if (this.trigger === 'hover' && !this.returningFocus) this.show();
        },
        onFocusOut(evt) {
            if (this.trigger !== 'hover') return;
            if (evt.relatedTarget && evt.currentTarget.contains(evt.relatedTarget)) return;
            this.startHideTimeout();
        },
        // Escape or a click outside. With focus inside, it goes back to the trigger.
        onOutside() {
            if (!this.shown) return;
            const target = this.$el.querySelector('.lpTarget');
            const focusInside = this.$el.contains(document.activeElement);
            this.hide();
            if (focusInside && this.focusable && target) {
                this.returningFocus = true;
                target.focus();
                this.$nextTick(() => { this.returningFocus = false; });
            }
        },
        toggle() {
            if (this.shown) this.hide();
            else this.show();
        },
        show() {
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
            // mouseenter fires on the whole popover (target + content), so moving the
            // mouse while interacting with a control inside an already-open popover
            // re-triggers this. Only emit 'shown' on the genuine closed->open transition,
            // so a one-time-setup listener (e.g. share.vue's focusShare) doesn't re-run
            // and silently redo side effects (it previously re-promoted a list the user
            // had just set back to private).
            if (this.shown) return;
            this.shown = true;
            this.$emit('shown');
        },
        startHideTimeout() {
            this.hideTimeout = setTimeout(this.hide, 50);
        },
        hide() {
            this.shown = false;
            this.$emit('hidden');
        },
    },
};
</script>
