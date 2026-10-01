<style lang="scss">
@import "../css/_globals";

</style>

<template>
    <Popover :shown="shown" :placement="placement" @mouseenter="show" @mouseleave="startHideTimeout">
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
    },
    data() {
        return {
            shown: false,
            hideTimeout: null,
        };
    },
    methods: {
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
