<template>
    <modal id="shortcutsHelpDialog" :shown="shown" @hide="shown = false">
        <div class="lpModalHeader">
            <h2 id="shortcutsHelpDialogLabel">{{ $t('shortcuts.title') }}</h2>
        </div>
        <table class="shortcutsTable">
            <tbody>
                <tr v-for="{ combo, description } in shortcuts" :key="combo">
                    <td><kbd class="shortcutKey">{{ combo }}</kbd></td>
                    <td class="shortcutDesc">{{ description }}</td>
                </tr>
            </tbody>
        </table>
    </modal>
</template>

<script>
import modal from './modal.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';
import { getRegistry } from '../services/shortcuts';

export default {
    name: 'ShortcutsHelp',
    components: { modal },
    data() {
        return { shown: false };
    },
    computed: {
        shortcuts() {
            return getRegistry();
        },
    },
    mounted() {
        registerDialogOpener('shortcutsHelp', () => {
            this.shown = true;
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('shortcutsHelp');
    },
    methods: {
        open() { this.shown = true; },
    },
};
</script>

<style lang="scss">
@import "../css/_globals";

.shortcutsTable {
    border-collapse: collapse;
    margin-top: 8px;
    width: 100%;

    td {
        padding: 6px 8px;
        vertical-align: middle;
    }
}

.shortcutKey {
    background: $color-control;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    font-family: monospace;
    font-size: $fontSize-sm;
    padding: 2px 6px;
    white-space: nowrap;
}

.shortcutDesc {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    padding-left: 12px;
}
</style>
