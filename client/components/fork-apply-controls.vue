<template>
    <span class="lpForkApply">
        <button
            class="lpVerifyBannerBtn lpForkApplyBtn"
            type="button"
            :disabled="busy || blocked"
            :title="blocked ? $t('list.versioning.updateBlocked') : null"
            @click="apply"
        >
            {{ busy ? $t('list.versioning.updating') : $t('list.versioning.updateTo', { version }) }}
        </button>
        <span v-if="blocked" class="lpForkApplyNote">{{ $t('list.versioning.updateBlocked') }}</span>
        <span v-if="error" class="lpForkApplyNote" role="alert">{{ $t('list.versioning.updateError') }}</span>
    </span>
</template>

<script>
import { fetchJson } from '../utils/utils';
import { notifyGlobalAlert } from '../services/app-events';

const { commitAndSave } = require('../utils/fork-apply-flow.js');

const { isForkUntouched } = require('../utils/fork-apply-plan.js');

export default {
    name: 'ForkApplyControls',
    props: {
        list: { type: Object, required: true },
        version: { type: Number, required: true },
    },
    data() {
        return {
            busy: false, blocked: false, error: false, checkId: 0,
        };
    },
    watch: {
        'list.id': { handler: 'check', immediate: true },
        version: 'check',
    },
    methods: {
        url(listId, suffix = '') {
            return `/api/lists/fork-apply/${encodeURIComponent(listId)}${suffix}`;
        },
        async check() {
            this.blocked = false;
            this.error = false;
            this.checkId += 1;
            const { checkId } = this;
            try {
                const data = await fetchJson(this.url(this.list.id), { credentials: 'same-origin' });
                if (checkId !== this.checkId) return;
                this.blocked = !isForkUntouched(this.list, this.$store.state.library, data.base);
            } catch (err) {
                // Leave the button enabled: clicking it surfaces the real error.
            }
        },
        async fetchAndRecord(list) {
            const data = await fetchJson(this.url(list.id), { credentials: 'same-origin' });
            if (!isForkUntouched(list, this.$store.state.library, data.base)) return { data, blocked: true };
            await fetchJson(this.url(list.id, '/record'), {
                method: 'POST', body: JSON.stringify({ version: data.toVersion }), credentials: 'same-origin',
            });
            return { data, blocked: false };
        },
        async apply() {
            if (this.busy || this.blocked) return;
            // The list may change under us (list switch): everything below uses the one clicked.
            const { list } = this;
            this.busy = true;
            this.error = false;
            try {
                let result;
                try {
                    result = await this.fetchAndRecord(list);
                } catch (err) {
                    // The author published again between the data fetch and the record: one retry on the newer version.
                    if (!err || err.statusCode !== 409) throw err;
                    result = await this.fetchAndRecord(list);
                }
                if (result.blocked) {
                    this.blocked = true;
                    return;
                }
                const { data } = result;
                // After the commit this component unmounts (the banner goes away), so failures are reported globally.
                await commitAndSave({
                    commit: (...args) => this.$store.commit(...args),
                    dispatch: (...args) => this.$store.dispatch(...args),
                    notify: notifyGlobalAlert,
                }, {
                    listId: list.id, base: data.base, latest: data.latest, toVersion: data.toVersion,
                });
            } catch (err) {
                this.error = true;
            } finally {
                this.busy = false;
            }
        },
    },
};
</script>

<style lang="scss">
@import "../css/_globals";

.lpForkApply {
    align-items: center;
    display: inline-flex;
    gap: $spacingSmall;
}

.lpForkApplyNote {
    font-size: 0.85em;
}
</style>
