<style lang="scss">
@import "../css/_globals";

#confirmDialog {
    width: min(420px, calc(100vw - 32px));

    p {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        line-height: 1.5;
        margin: 0 0 20px;
    }
}
</style>

<template>
    <modal id="confirmDialog" :shown="shown" @hide="$emit('cancel')">
        <h2>{{ title }}</h2>
        <p class="lp-confirm-message">
            {{ message }}
        </p>
        <div class="lpModalActions">
            <button type="button" class="lpButton lp-confirm-cancel" @click="$emit('cancel')">
                {{ $t('acct.cancel') }}
            </button>
            <button
                type="button"
                class="lpButton lp-confirm-ok"
                :class="{ lpButtonDanger: danger }"
                @click="$emit('confirm')"
            >
                {{ confirmLabel }}
            </button>
        </div>
    </modal>
</template>

<script>
import modal from './modal.vue';

// A confirmation in the app's own style, instead of the browser's confirm box.
export default {
    name: 'ConfirmDialog',
    components: { modal },
    props: {
        shown: { type: Boolean, default: false },
        title: { type: String, default: '' },
        message: { type: String, default: '' },
        confirmLabel: { type: String, default: '' },
        danger: { type: Boolean, default: false },
    },
    emits: ['confirm', 'cancel'],
};
</script>
