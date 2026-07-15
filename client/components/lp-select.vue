<style lang="scss">
@import "../css/_globals";

.lpSelectWrap {
    position: relative;
    width: 100%;
}

.lpSelectTrigger {
    align-items: center;
    background: $color-bg;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    box-sizing: border-box;
    color: $color-text;
    cursor: pointer;
    display: flex;
    font-family: $font-family-base;
    font-size: $fontSize-base;
    justify-content: space-between;
    min-height: 40px;
    padding: 0 12px;
    user-select: none;
    width: 100%;

    &:focus {
        border-color: $color-accent;
        box-shadow: 0 0 0 4px rgba(var(--color-accent-rgb), 0.1);
        outline: none;
    }

    &.lpSelectOpen {
        border-color: $color-accent;
        box-shadow: 0 0 0 4px rgba(var(--color-accent-rgb), 0.1);
    }

    i {
        flex: 0 0 auto;
        margin-left: 8px;
        opacity: 0.5;
    }
}

.lpSelectDropdown {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    left: 0;
    overflow: hidden;
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    z-index: $aboveSidebar + 1;
}

.lpSelectOption {
    color: $color-text;
    cursor: pointer;
    font-size: $fontSize-sm;
    padding: 10px 12px;

    &:hover,
    &.lpSelectOptionActive {
        background: rgba(var(--color-accent-rgb), 0.08);
        color: $color-accent;
    }
}
</style>

<template>
    <div class="lpSelectWrap">
        <select class="lpInvisible" :value="value" tabindex="-1" @change="select($event.target.value)">
            <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <div
            class="lpSelectTrigger"
            :class="{ lpSelectOpen: isOpen }"
            tabindex="0"
            @click="toggle"
            @keydown="onKeydown"
        >
            <span>{{ selectedLabel }}</span>
            <i class="lpSprite lpExpand" />
        </div>
        <div v-if="isOpen" class="lpSelectDropdown">
            <div
                v-for="opt in options"
                :key="opt.value"
                class="lpSelectOption"
                :class="{ lpSelectOptionActive: opt.value === value }"
                @click="select(opt.value)"
            >
                {{ opt.label }}
            </div>
        </div>
    </div>
</template>

<script>
import { bindWindowListeners, unbindWindowListeners } from '../services/window-events';

export default {
    name: 'LpSelect',
    emits: ['change'],
    props: {
        value: { type: String, required: true },
        options: { type: Array, required: true },
    },
    data() {
        return {
            isOpen: false,
            closeBindings: [],
        };
    },
    computed: {
        selectedLabel() {
            const opt = this.options.find(o => o.value === this.value);
            return opt ? opt.label : '';
        },
    },
    created() {
        this.closeBindings = [
            { eventName: 'keyup', handler: this.closeOnEscape },
            { eventName: 'click', handler: this.close },
        ];
    },
    beforeUnmount() {
        this.unbindCloseListeners();
    },
    methods: {
        toggle(evt) {
            evt.stopPropagation();
            this.isOpen ? this.close() : this.open();
        },
        open() {
            this.isOpen = true;
            bindWindowListeners(this.closeBindings);
        },
        close() {
            this.isOpen = false;
            unbindWindowListeners(this.closeBindings);
        },
        select(value) {
            this.$emit('change', value);
            this.close();
        },
        closeOnEscape(evt) {
            if (evt.keyCode === 27) this.close();
        },
        onKeydown(evt) {
            if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault();
                this.isOpen ? this.close() : this.open();
            }
        },
        bindCloseListeners() {
            bindWindowListeners(this.closeBindings);
        },
        unbindCloseListeners() {
            unbindWindowListeners(this.closeBindings);
        },
    },
};
</script>
