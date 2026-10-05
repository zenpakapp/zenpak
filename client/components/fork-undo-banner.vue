<template>
    <div v-if="undo" class="lpVerifyBanner lpForkUndoBanner">
        <span>{{ $t('list.versioning.updatedBanner', { version: list.forkedFrom.version }) }}</span>
        <button class="lpVerifyBannerBtn" type="button" @click="askUndo">
            {{ $t('list.versioning.undoUpdate') }}
        </button>
        <button class="lpVerifyBannerBtn" type="button" @click="keep">
            {{ $t('list.versioning.undoDismiss') }}
        </button>
    </div>
</template>

<script>
import { openSpeedbump } from '../services/speedbump';

export default {
    name: 'ForkUndoBanner',
    props: {
        list: { type: Object, required: true },
    },
    computed: {
        undo() {
            return this.list && this.list.forkedFrom && this.list.forkedFrom.undo;
        },
    },
    methods: {
        askUndo() {
            openSpeedbump(() => {
                this.$store.commit('undoForkUpdate', { listId: this.list.id });
            }, {
                title: this.$t('list.versioning.undoConfirmTitle'),
                body: this.$t('list.versioning.undoConfirmBody'),
            }).catch(() => {});
        },
        keep() {
            this.$store.commit('discardForkUndo', { listId: this.list.id });
        },
    },
};
</script>
