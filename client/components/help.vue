<style lang="scss">

#help {
    width: 800px;
}

</style>

<template>
    <modal id="help" :shown="shown" @hide="shown = false">
        <h2>{{ $t('misc.helpTitle') }}</h2>

        <p>{{ $t('misc.helpGettingStarted') }}</p>
        <ol>
            <li>{{ $t('misc.helpStep1') }}</li>
            <li>{{ $t('misc.helpStep2') }}</li>
            <li>{{ $t('misc.helpStep3') }}</li>
        </ol>
        <hr>
        <strong>{{ $t('misc.helpQtyWornTitle') }}</strong>
        <p>{{ $t('misc.helpQtyWornText') }}</p>
        <hr>
        <strong>{{ $t('misc.helpLinkedItemsTitle') }}</strong>
        <p>{{ $t('misc.helpLinkedItemsText') }}</p>
        <hr>
        <p><a class="lpHref" href="mailto:info@zenpak.app">{{ $t('misc.helpEmailCta') }}</a></p>
    </modal>
</template>

<script>
import modal from './modal.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';

export default {
    name: 'Help',
    components: {
        modal,
    },
    data() {
        return {
            shown: false,
        };
    },
    mounted() {
        registerDialogOpener('help', () => {
            this.shown = true;
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('help');
    },
};
</script>
