<style lang="scss">
@import "../css/_globals";

.lpTemplatePicker {
    background: rgba(12, 35, 27, 0.62);
    bottom: 0;
    left: 0;
    position: fixed;
    right: 0;
    top: 0;
    z-index: $dialog;
}

.lpTemplatePickerModal {
    background: $color-surface;
    border-radius: $radius-lg;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
    left: 50%;
    max-height: calc(90vh - #{$spacingLarge} * 2);
    overflow-y: auto;
    padding: 28px;
    position: fixed;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
    width: 640px;
    max-width: calc(100vw - #{$spacingLarge} * 2);
    z-index: $dialog + 1;
}

.lpTemplatePickerTitle {
    font-size: 28px;
    font-weight: $fontWeight-bold;
    margin: 0 0 $spacingSmaller;
}

.lpTemplatePickerSubtitle {
    color: $color-text-muted;
    font-size: $fontSize-base;
    margin: 0 0 $spacingLarge;
}

.lpTemplatePickerSectionTitle {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    letter-spacing: $letterSpacing-caps;
    margin: 0 0 $spacingSmall;
    text-transform: uppercase;
}

.lpTemplatePickerCards {
    display: flex;
    flex-direction: column;
    gap: $spacingSmall;
    margin-bottom: $spacingLarge;
}

.lpTemplatePickerSetup {
    background: $color-bg;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    display: grid;
    gap: $spacingMedium;
    grid-template-columns: 1fr 1fr;
    margin-bottom: $spacingLarge;
    padding: $spacingMedium;
}

.lpTemplatePickerField {
    display: flex;
    flex-direction: column;
    gap: 8px;

    label {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        font-weight: $fontWeight-bold;
    }

    input,
    select {
        background: $color-surface;
        border: 1px solid $color-border;
        border-radius: $radius-sm;
        color: $color-text;
        font: inherit;
        min-height: 42px;
        padding: 8px 10px;
        width: 100%;
    }
}

.lpTemplatePickerFieldWide {
    grid-column: 1 / -1;
}

.lpTemplatePickerSegments {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    display: grid;
    gap: 4px;
    grid-template-columns: repeat(2, 1fr);
    padding: 4px;
}

.lpTemplatePickerSegment {
    background: transparent;
    border: 0;
    border-radius: $radius-sm;
    color: $color-text-muted;
    cursor: pointer;
    font: inherit;
    font-weight: $fontWeight-bold;
    min-height: 34px;
    padding: 6px 10px;
}

.lpTemplatePickerSegmentActive {
    background: $color-accent;
    color: #fff;
}

.lpTemplatePickerCard {
    align-items: center;
    background: $color-bg;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    display: flex;
    gap: $spacingMedium;
    justify-content: space-between;
    padding: $spacingMedium $spacingMedium $spacingMedium $spacingLarge;
    transition: border-color $transitionDurationFast;

    &:hover {
        border-color: $color-accent;
    }
}

.lpTemplatePickerCardBlank {
    border-color: rgba(var(--color-accent-rgb), 0.35);
}

.lpTemplatePickerCardBody {
    flex: 1;
}

.lpTemplatePickerCardName {
    font-size: $fontSize-md;
    font-weight: $fontWeight-bold;
    margin: 0 0 4px;
}

.lpTemplatePickerCardDesc {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    margin: 0;
}

@media (max-width: 640px) {
    .lpTemplatePickerSetup {
        grid-template-columns: 1fr;
    }
}
</style>

<template>
    <teleport to="body">
        <div class="lpTemplatePicker" @click.self="onDismiss">
            <div class="lpTemplatePickerModal">
                <p class="lpTemplatePickerTitle">{{ $t('library.templatePickerTitle') }}</p>
                <p class="lpTemplatePickerSubtitle">{{ $t('library.templatePickerSubtitle') }}</p>
                <div class="lpTemplatePickerSetup">
                    <div class="lpTemplatePickerField lpTemplatePickerFieldWide">
                        <label for="template-list-name">{{ $t('library.templatePickerListName') }}</label>
                        <input id="template-list-name" v-model.trim="setup.listName" type="text" :placeholder="$t('library.templatePickerListNamePlaceholder')">
                    </div>
                    <div v-if="showDisplayName" class="lpTemplatePickerField lpTemplatePickerFieldWide">
                        <label for="template-display-name">{{ $t('library.templatePickerDisplayName') }}</label>
                        <input id="template-display-name" v-model.trim="setup.displayName" type="text" :placeholder="$t('library.templatePickerDisplayNamePlaceholder')">
                    </div>
                    <div class="lpTemplatePickerField">
                        <label>{{ $t('library.templatePickerUnits') }}</label>
                        <div class="lpTemplatePickerSegments">
                            <button
                                v-for="option in unitOptions"
                                :key="option.value"
                                class="lpTemplatePickerSegment"
                                :class="{ lpTemplatePickerSegmentActive: setup.units === option.value }"
                                type="button"
                                @click="setup.units = option.value"
                            >
                                {{ option.label }}
                            </button>
                        </div>
                    </div>
                    <div class="lpTemplatePickerField">
                        <label>{{ $t('library.templatePickerCurrency') }}</label>
                        <div class="lpTemplatePickerSegments lpTemplatePickerSegmentsCurrency">
                            <button
                                v-for="option in currencyOptions"
                                :key="option"
                                class="lpTemplatePickerSegment"
                                :class="{ lpTemplatePickerSegmentActive: setup.currencySymbol === option }"
                                type="button"
                                @click="setup.currencySymbol = option"
                            >
                                {{ option }}
                            </button>
                        </div>
                    </div>
                </div>
                <p class="lpTemplatePickerSectionTitle">{{ $t('library.templatePickerStartWith') }}</p>
                <div class="lpTemplatePickerCards">
                    <div class="lpTemplatePickerCard lpTemplatePickerCardBlank">
                        <div class="lpTemplatePickerCardBody">
                            <p class="lpTemplatePickerCardName">{{ $t('library.templatePickerBlankTitle') }}</p>
                            <p class="lpTemplatePickerCardDesc">{{ $t('library.templatePickerBlankDesc') }}</p>
                        </div>
                        <button class="lpButton" @click="onDismiss">{{ $t('library.templatePickerBlankButton') }}</button>
                    </div>
                    <div v-for="template in templates" :key="template.id" class="lpTemplatePickerCard">
                        <div class="lpTemplatePickerCardBody">
                            <p class="lpTemplatePickerCardName">{{ templateName(template) }}</p>
                            <p class="lpTemplatePickerCardDesc">{{ templateDescription(template) }}</p>
                        </div>
                        <button class="lpButton" @click="onSelect(template)">{{ $t('library.templatePickerSelectButton') }}</button>
                    </div>
                </div>
            </div>
        </div>
    </teleport>
</template>

<script>
import { templates } from '../composables/useTemplatePicker.js';

export default {
    name: 'TemplatePicker',
    emits: ['select', 'dismiss'],
    data() {
        return {
            templates,
            setup: this.createInitialSetup(),
        };
    },
    computed: {
        currencyOptions() {
            return ['€', '$'];
        },
        showDisplayName() {
            const profile = this.$store.state.library && this.$store.state.library.publicProfile;
            return this.$store.state.loggedIn && (!profile || !profile.displayName);
        },
        unitOptions() {
            return [
                { value: 'metric', label: this.$t('library.templatePickerMetricUnits') },
                { value: 'imperial', label: this.$t('library.templatePickerImperialUnits') },
            ];
        },
    },
    methods: {
        createInitialSetup() {
            const library = this.$store.state.library;
            const locale = String(this.$i18n?.locale || navigator.language || 'en');
            const metricLocale = !locale.toLowerCase().startsWith('en');
            const profile = library && library.publicProfile;

            return {
                currencySymbol: library?.currencySymbol || (metricLocale ? '€' : '$'),
                displayName: profile?.displayName || '',
                listName: '',
                units: library?.itemUnit === 'g' || metricLocale ? 'metric' : 'imperial',
            };
        },
        getSetup() {
            return { ...this.setup };
        },
        onSelect(template) {
            this.$emit('select', template.data, this.getSetup());
        },
        onDismiss() {
            this.$emit('dismiss', this.getSetup());
        },
        templateDescription(template) {
            return this.$t(`library.templatePickerTemplates.${template.id}.description`);
        },
        templateName(template) {
            return this.$t(`library.templatePickerTemplates.${template.id}.name`);
        },
    },
};
</script>
