<style lang="scss">
@import "../css/_globals";

.lpReportBtn {
    background: none;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 11px;
    padding: 2px 6px;

    &:hover { color: var(--color-warning, #e53e3e); }
}

.lpReportModal {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    padding: 16px;
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    width: 220px;
    z-index: 100;
}

.lpReportTitle {
    color: $color-text;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    margin-bottom: 10px;
}

.lpReportReasons {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
}

.lpReportReason {
    align-items: center;
    cursor: pointer;
    display: flex;
    font-size: $fontSize-sm;
    gap: 8px;
    color: $color-text-muted;

    &:hover { color: $color-text; }
}

.lpReportActions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.lpReportSubmit {
    background: var(--color-warning, #e53e3e);
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-size: $fontSize-sm;
    padding: 5px 12px;

    &:disabled { opacity: 0.5; }
}

.lpReportCancel {
    background: none;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text-muted;
    cursor: pointer;
    font-size: $fontSize-sm;
    padding: 5px 12px;
}

.lpReportConfirm {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    text-align: center;
    padding: 4px 0;
}
</style>

<template>
    <div style="position:relative;display:inline-block">
        <button class="lpReportBtn" @click.stop.prevent="open = !open">{{ $t('misc.report') }}</button>
        <div v-if="open" class="lpReportModal" @click.stop>
            <div v-if="!submitted">
                <div class="lpReportTitle">{{ $t('misc.reportThis') }} {{ targetType }}</div>
                <div class="lpReportReasons">
                    <label v-for="r in reasons" :key="r.value" class="lpReportReason">
                        <input type="radio" v-model="reason" :value="r.value" />
                        {{ r.label }}
                    </label>
                </div>
                <div v-if="error" style="color:var(--color-warning,#e53e3e);font-size:11px;margin-bottom:8px">{{ error }}</div>
                <div class="lpReportActions">
                    <button class="lpReportCancel" @click="open = false">{{ $t('misc.cancel') }}</button>
                    <button class="lpReportSubmit" :disabled="!reason || submitting" @click="submit">
                        {{ submitting ? '…' : $t('misc.send') }}
                    </button>
                </div>
            </div>
            <div v-else class="lpReportConfirm">Thanks, we'll review it.</div>
        </div>
    </div>
</template>

<script>
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
            reasons: [
                { value: 'spam', label: 'Spam' },
                { value: 'inappropriate', label: 'Inappropriate content' },
                { value: 'fake', label: 'Fake or misleading' },
                { value: 'other', label: 'Other' },
            ],
        };
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
                setTimeout(() => { this.open = false; this.submitted = false; }, 2000);
            } catch {
                this.error = 'Something went wrong.';
            } finally {
                this.submitting = false;
            }
        },
    },
};
</script>
