<style lang="scss">
@import "../css/_globals";

.lpVersionDiff {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 640px;
    max-height: 70vh;
    overflow-y: auto;
}

.lpVersionDiff h3 {
    margin: 0 0 4px;
}

.lpVersionDiff ul {
    margin: 0;
    padding-left: 20px;
}

.lpVersionDiffMuted {
    opacity: 0.7;
}

.lpVersionDiffAffiliate {
    border: 1px solid currentColor;
    border-radius: 4px;
    font-size: 0.75em;
    margin-left: 6px;
    padding: 0 4px;
}
</style>

<template>
    <modal id="forkDiffDialog" :shown="shown" @hide="shown = false">
        <h2 id="forkDiffDialogLabel">
            {{ result ? $t('list.versioning.diffTitle', { from: result.fromVersion, to: result.toVersion }) : $t('list.versioning.viewChanges') }}
        </h2>
        <p v-if="loading">
            {{ $t('list.versioning.diffLoading') }}
        </p>
        <p v-else-if="error">
            {{ $t('list.versioning.diffError') }}
        </p>
        <div v-else-if="result" class="lpVersionDiff">
            <p>
                {{ $t('list.versioning.diffBaseWeight') }}:
                {{ weight(diff.totals.baseWeightFrom, totalUnit) }} → {{ weight(diff.totals.baseWeightTo, totalUnit) }}
                · {{ $t('list.versioning.diffItemCount') }}: {{ diff.totals.qtyFrom }} → {{ diff.totals.qtyTo }}
            </p>
            <p v-if="empty">
                {{ $t('list.versioning.diffEmpty') }}
            </p>
            <section v-if="diff.meta.length">
                <h3>{{ $t('list.versioning.diffListDetails') }}</h3>
                <ul>
                    <li v-for="change in diff.meta" :key="`meta-${change.field}`">
                        {{ fieldLabel(change.field) }}: {{ value(change.field, change.from) }} → {{ value(change.field, change.to) }}
                    </li>
                </ul>
            </section>
            <section v-if="diff.added.length">
                <h3>{{ $t('list.versioning.diffAdded') }}</h3>
                <ul>
                    <li v-for="entry in diff.added" :key="`added-${entry.item.id}`">
                        {{ entry.item.name }} · {{ weight(entry.item.weight, itemUnit) }}
                        <span class="lpVersionDiffMuted">({{ entry.category.name }})</span>
                    </li>
                </ul>
            </section>
            <section v-if="diff.removed.length">
                <h3>{{ $t('list.versioning.diffRemoved') }}</h3>
                <ul>
                    <li v-for="entry in diff.removed" :key="`removed-${entry.item.id}`">
                        {{ entry.item.name }} · {{ weight(entry.item.weight, itemUnit) }}
                        <span class="lpVersionDiffMuted">({{ entry.category.name }})</span>
                    </li>
                </ul>
            </section>
            <section v-if="diff.moved.length">
                <h3>{{ $t('list.versioning.diffMoved') }}</h3>
                <ul>
                    <li v-for="entry in diff.moved" :key="`moved-${entry.item.id}`">
                        {{ entry.item.name }}: {{ entry.fromCategory.name }} → {{ entry.toCategory.name }}
                    </li>
                </ul>
            </section>
            <section v-if="diff.modified.length">
                <h3>{{ $t('list.versioning.diffModified') }}</h3>
                <ul>
                    <li v-for="entry in diff.modified" :key="`modified-${entry.item.id}`">
                        <strong>{{ entry.item.name }}</strong>
                        <ul>
                            <li v-for="change in entry.changes" :key="`${entry.item.id}-${change.field}`">
                                {{ fieldLabel(change.field) }}: {{ value(change.field, change.from) }} → {{ value(change.field, change.to) }}
                                <span v-if="change.affiliate" class="lpVersionDiffAffiliate">{{ $t('list.versioning.diffAffiliate') }}</span>
                            </li>
                        </ul>
                    </li>
                </ul>
            </section>
            <section v-if="diff.categoriesRenamed.length">
                <h3>{{ $t('list.versioning.diffCategoriesRenamed') }}</h3>
                <ul>
                    <li v-for="category in diff.categoriesRenamed" :key="`category-${category.id}`">
                        {{ category.from }} → {{ category.to }}
                    </li>
                </ul>
            </section>
        </div>
    </modal>
</template>

<script>
import modal from './modal.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';
import { fetchJson } from '../utils/utils';
import { formatDiffValue, isEmptyDiff } from '../utils/version-diff-format';

export default {
    name: 'ListVersionDiff',
    components: {
        modal,
    },
    data() {
        return {
            shown: false,
            loading: false,
            error: false,
            result: null,
            requestId: 0,
        };
    },
    computed: {
        diff() {
            return this.result ? this.result.diff : null;
        },
        empty() {
            return isEmptyDiff(this.diff);
        },
        itemUnit() {
            const library = this.$store.state.library;
            return (library && library.itemUnit) || 'g';
        },
        totalUnit() {
            const library = this.$store.state.library;
            return (library && library.totalUnit) || this.itemUnit;
        },
    },
    mounted() {
        registerDialogOpener('forkDiff', (listId) => this.open(listId));
    },
    beforeUnmount() {
        unregisterDialogOpener('forkDiff');
    },
    methods: {
        open(listId) {
            this.requestId += 1;
            const { requestId } = this;
            this.shown = true;
            this.loading = true;
            this.error = false;
            this.result = null;
            fetchJson(`/api/lists/fork-diff/${encodeURIComponent(listId)}`, { credentials: 'same-origin' })
                .then((response) => {
                    if (requestId !== this.requestId) return;
                    if (!response || !response.diff) {
                        this.error = true;
                        return;
                    }
                    this.result = response;
                })
                .catch(() => {
                    if (requestId === this.requestId) this.error = true;
                })
                .finally(() => {
                    if (requestId === this.requestId) this.loading = false;
                });
        },
        fieldLabel(field) {
            return this.$t(`list.versioning.diffFields.${field}`);
        },
        value(field, raw) {
            return formatDiffValue(field, raw, { itemUnit: this.itemUnit, currencySymbol: this.result && this.result.currencySymbol });
        },
        weight(mg, unit) {
            return formatDiffValue('weight', mg, { itemUnit: unit });
        },
    },
};
</script>
