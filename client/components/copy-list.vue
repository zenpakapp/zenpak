<style lang="scss">
@import "../css/_globals";

.copyListBody {
    display: flex;
    flex-direction: column;
    gap: $space-16;
}

</style>

<template>
    <modal id="copyListDialog" :shown="shown" @hide="shown = false">
        <h2>{{ $t('misc.copyList') }}</h2>
        <div class="copyListBody">
            <div>
                <label for="listToCopy">{{ $t('misc.sourceList') }}</label>
                <select id="listToCopy" v-model="listId">
                    <option v-for="list in library.lists" :value="list.id">
                        {{ list.name }}
                    </option>
                </select>
            </div>
            <p class="lpWarning">
                <b>{{ $t('misc.note') }}</b> {{ $t('misc.copyingWarning') }}
            </p>
            <div class="lpModalActions">
                <button type="button" class="lpButton close" @click="shown = false">
                    {{ $t('misc.cancel') }}
                </button>
                <button id="copyConfirm" type="button" class="lpButton" @click="copyList">
                    {{ $t('misc.copyList') }}
                </button>
            </div>
        </div>
    </modal>
</template>

<script>
import modal from './modal.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';

export default {
    name: 'CopyList',
    components: {
        modal,
    },
    data() {
        return {
            listId: false,
            shown: false,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
    },
    mounted() {
        registerDialogOpener('copyList', () => {
            this.shown = true;
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('copyList');
    },
    methods: {
        copyList() {
            if (!this.listId) return;
            try {
                this.$store.commit('copyList', this.listId);
            } finally {
                this.shown = false;
            }
        },
    },
};
</script>
