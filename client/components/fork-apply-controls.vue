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
        url(suffix = '') {
            return `/api/lists/fork-apply/${encodeURIComponent(this.list.id)}${suffix}`;
        },
        async check() {
            this.blocked = false;
            this.error = false;
            this.checkId += 1;
            const { checkId } = this;
            try {
                const data = await fetchJson(this.url(), { credentials: 'same-origin' });
                if (checkId !== this.checkId) return;
                this.blocked = !isForkUntouched(this.list, this.$store.state.library, data.base);
            } catch (err) {
                // Leave the button enabled: clicking it surfaces the real error.
            }
        },
        async fetchAndRecord() {
            const data = await fetchJson(this.url(), { credentials: 'same-origin' });
            if (!isForkUntouched(this.list, this.$store.state.library, data.base)) return { data, blocked: true };
            await fetchJson(this.url('/record'), {
                method: 'POST', body: JSON.stringify({ version: data.toVersion }), credentials: 'same-origin',
            });
            return { data, blocked: false };
        },
        async apply() {
            if (this.busy || this.blocked) return;
            this.busy = true;
            this.error = false;
            try {
                let result;
                try {
                    result = await this.fetchAndRecord();
                } catch (err) {
                    // The author published again between the data fetch and the record: one retry on the newer version.
                    if (!err || err.statusCode !== 409) throw err;
                    result = await this.fetchAndRecord();
                }
                if (result.blocked) {
                    this.blocked = true;
                    return;
                }
                const { data } = result;
                this.$store.commit('applyForkUpdate', {
                    listId: this.list.id, base: data.base, latest: data.latest, toVersion: data.toVersion,
                });
                try {
                    await this.$store.dispatch('saveNow');
                } catch (saveError) {
                    // Never keep a half-applied copy: reload what the server has.
                    await this.$store.dispatch('loadRemote');
                    this.error = true;
                }
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
