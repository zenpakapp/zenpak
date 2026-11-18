<style lang="scss">
@import "../css/_globals";

.lpReportBtn {
    background: none;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    font-size: $fontSize-xs;
    padding: $space-2 $space-6;

    &:hover {
        color: $color-text;
        text-decoration: underline;
    }
}

.lpReportModal {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-lg;
    box-shadow: $shadow-popover;
    left: 0;
    padding: $space-16;
    position: absolute;
    top: calc(100% + 4px);
    width: 220px;
    z-index: $dialog;
}

.lpReportTitle {
    color: $color-text;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    margin-bottom: $space-10;
}

.lpReportReasons {
    display: flex;
    flex-direction: column;
    gap: $space-6;
    margin-bottom: $space-12;
}

.lpReportReason {
    align-items: center;
    color: $color-text-muted;
    cursor: pointer;
    display: flex;
    font-size: $fontSize-sm;
    gap: $space-8;

    &:hover { color: $color-text; }
}

.lpReportActions {
    display: flex;
    gap: $space-8;
    justify-content: flex-end;
}

.lpReportSubmit {
    background: $color-danger-solid;
    border: none;
    border-radius: $radius-md;
    color: $color-on-solid;
    cursor: pointer;
    font-size: $fontSize-sm;
    padding: $space-6 $space-12;

    &:disabled { opacity: 0.5; }
}

.lpReportCancel {
    background: none;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    color: $color-text-muted;
    cursor: pointer;
    font-size: $fontSize-sm;
    padding: $space-6 $space-12;
}

.lpReportConfirm {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    padding: $space-4 0;
    text-align: center;
}
</style>

<template>
    <div style="display: inline-block; position: relative;">
        <button class="lpReportBtn" @click.stop.prevent="open = !open">
            {{ $t('misc.report') }}
        </button>
        <div v-if="open" class="lpReportModal" @click.stop>
            <div v-if="!submitted">
                <div class="lpReportTitle">
                    {{ $t('misc.reportThis') }} {{ targetType }}
                </div>
                <div class="lpReportReasons">
                    <label v-for="r in reasons" :key="r.value" class="lpReportReason">
                        <input v-model="reason" type="radio" :value="r.value">
                        {{ r.label }}
                    </label>
                </div>
                <div v-if="error" style="color: var(--color-warning, #e53e3e); font-size: 11px; margin-bottom: 8px;">
                    {{ error }}
                </div>
                <div class="lpReportActions">
                    <button class="lpReportCancel" @click="open = false">
                        {{ $t('misc.cancel') }}
                    </button>
                    <button class="lpReportSubmit" :disabled="!reason || submitting" @click="submit">
                        {{ submitting ? '…' : $t('misc.send') }}
                    </button>
                </div>
            </div>
            <div v-else class="lpReportConfirm">
                {{ $t('misc.reportThanks') }}
            </div>
        </div>
    </div>
</template>

<script>
import { FEEDBACK_MS } from '../services/timings';
import { fetchJson } from '../utils/utils.js';

export default {
    name: 'ReportButton',
    props: {
        targetType: { type: String, required: true }, // 'list' | 'user'
        targetId: { type: String, required: true },
    },
    data() {
        return {
            open: false,
            reason: '',
            submitting: false,
            submitted: false,
            error: null,
        };
    },
    computed: {
        reasons() {
            return [
                { value: 'spam', label: this.$t('misc.reportReasonSpam') },
                { value: 'inappropriate', label: this.$t('misc.reportReasonInappropriate') },
                { value: 'fake', label: this.$t('misc.reportReasonFake') },
                { value: 'other', label: this.$t('misc.reportReasonOther') },
            ];
        },
    },
    methods: {
        async submit() {
            if (!this.reason) return;
            this.submitting = true;
            this.error = null;
            try {
                await fetchJson('/api/reports', {
                    method: 'POST',
                    body: JSON.stringify({
                        targetType: this.targetType,
                        targetId: this.targetId,
                        reason: this.reason,
                    }),
                });
                this.submitted = true;
                setTimeout(() => { this.open = false; this.submitted = false; }, FEEDBACK_MS);
            } catch {
                this.error = this.$t('misc.reportError');
            } finally {
                this.submitting = false;
            }
        },
    },
};
</script>
