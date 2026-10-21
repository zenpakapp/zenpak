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

.lpTemplatePickerCancel {
    margin-top: $spacingLarge;
}

.lpTemplatePickerTitle {
    font-size: 28px;
    font-weight: $fontWeight-bold;
    margin: 0 0 $spacingSmaller;
}

.lpTemplatePickerSubtitle {
    color: $color-text-muted;
    font-size: $fontSize-base;
    font-style: italic;
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
    display: grid;
    gap: $spacingSmall;
    grid-template-columns: 1fr 1fr;
    margin-bottom: $spacingLarge;
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

.lpTemplatePickerError {
    color: #dc3545;
    font-size: $fontSize-xs;
    margin: 0;
}

.lpTemplatePickerHint {
    color: $color-text-muted;
    font-size: $fontSize-xs;
    margin: -2px 0 0;
}

.lpTemplatePickerSetup {
    display: flex;
    flex-direction: column;
    gap: $spacingSmall;
    margin-bottom: $spacingLarge;
}

.lpTemplatePickerSetupCard {
    background: $color-bg;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    padding: $spacingMedium;
}

.lpTemplatePickerSetupTitle {
    color: $color-text;
    font-size: $fontSize-base;
    font-weight: $fontWeight-bold;
    margin: 0 0 $spacingSmall;
}

.lpTemplatePickerSettingsGrid {
    display: grid;
    gap: $spacingMedium;
    grid-template-columns: 1fr 1fr;
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
    background: $color-bg;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    color: inherit;
    cursor: pointer;
    display: block;
    font: inherit;
    padding: $spacingMedium;
    text-align: left;
    transition: border-color $transitionDurationFast, background-color $transitionDurationFast;
    width: 100%;

    &:hover,
    &:focus-visible {
        background: $color-surface;
        border-color: $color-accent;
    }

    &:focus-visible {
        outline: 2px solid $color-accent;
        outline-offset: 2px;
    }
}

.lpTemplatePickerCardBlank {
    border-color: rgba(var(--color-accent-rgb), 0.35);
}

.lpTemplatePickerCardName {
    display: block;
    font-size: $fontSize-md;
    font-weight: $fontWeight-bold;
    margin: 0 0 4px;
}

.lpTemplatePickerCardDesc {
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    color: $color-text-muted;
    display: -webkit-box;
    font-size: $fontSize-sm;
    margin: 0;
    overflow: hidden;
}

@media (max-width: 640px) {
    .lpTemplatePickerSettingsGrid,
    .lpTemplatePickerCards {
        grid-template-columns: 1fr;
    }
}
</style>

<template>
    <teleport to="body">
        <div class="lpTemplatePicker">
            <div class="lpTemplatePickerModal">
                <p class="lpTemplatePickerTitle">
                    {{ addMode ? $t('library.templatePickerAddTitle') : $t('library.templatePickerTitle') }}
                </p>
                <p class="lpTemplatePickerSubtitle">
                    {{ addMode ? $t('library.templatePickerAddSubtitle') : $t('library.templatePickerSubtitle') }}
                </p>
                <div class="lpTemplatePickerSetup">
                    <div class="lpTemplatePickerSetupCard">
                        <div class="lpTemplatePickerField">
                            <label for="template-list-name">{{ addMode ? $t('library.templatePickerAddListName') : $t('library.templatePickerListName') }}</label>
                            <input id="template-list-name" v-model.trim="setup.listName" type="text" :placeholder="$t('library.templatePickerListNamePlaceholder')">
                        </div>
                    </div>
                    <div v-if="showDisplayName" class="lpTemplatePickerSetupCard">
                        <div class="lpTemplatePickerField">
                            <label for="template-display-name">{{ $t('library.templatePickerDisplayName') }}</label>
                            <input id="template-display-name" v-model.trim="setup.displayName" type="text" :placeholder="$t('library.templatePickerDisplayNamePlaceholder')">
                            <p class="lpTemplatePickerHint">
                                {{ $t('library.templatePickerDisplayNameHint') }}
                            </p>
                            <p v-if="displayNameError" class="lpTemplatePickerError">
                                {{ displayNameError }}
                            </p>
                        </div>
                    </div>
                    <div v-if="!addMode" class="lpTemplatePickerSetupCard">
                        <p class="lpTemplatePickerSetupTitle">
                            {{ $t('library.templatePickerSettingsSection') }}
                        </p>
                        <div class="lpTemplatePickerSettingsGrid">
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
                    </div>
                </div>
                <p v-if="!addMode" class="lpTemplatePickerSectionTitle">
                    {{ $t('library.templatePickerStartWith') }}
                </p>
                <div class="lpTemplatePickerCards">
                    <button v-if="!addMode" type="button" class="lpTemplatePickerCard lpTemplatePickerCardBlank" @click="onDismiss">
                        <span class="lpTemplatePickerCardName">
                            {{ $t('library.templatePickerBlankTitle') }}
                        </span>
                        <span class="lpTemplatePickerCardDesc">
                            {{ $t('library.templatePickerBlankDesc') }}
                        </span>
                    </button>
                    <button v-for="template in templates" :key="template.id" type="button" class="lpTemplatePickerCard" @click="onSelect(template)">
                        <span class="lpTemplatePickerCardName">
                            {{ templateName(template) }}
                        </span>
                        <span class="lpTemplatePickerCardDesc">
                            {{ templateSummary(template) }}
                        </span>
                    </button>
                </div>
                <button v-if="addMode" class="lpButton lpTemplatePickerCancel" type="button" @click="$emit('dismiss')">
                    {{ $t('library.templatePickerCancel') }}
                </button>
            </div>
        </div>
    </teleport>
</template>

<script>
import { templates, templateWeightMg } from '../composables/useTemplatePicker.js';
import { isReservedDisplayName } from '../utils/reserved-names';
import weightUtils from '../utils/weight.js';

export default {
    name: 'TemplatePicker',
    props: {
        requestDisplayName: {
            type: Boolean,
            default: false,
        },
        // 'add' = reopened from the library to add one more list (no profile or unit setup).
        mode: {
            type: String,
            default: 'signup',
        },
    },
    emits: ['select', 'dismiss', 'add'],
    data() {
        return {
            templates,
            displayNameError: '',
            setup: this.createInitialSetup(),
        };
    },
    computed: {
        currencyOptions() {
            return ['€', '$'];
        },
        addMode() {
            return this.mode === 'add';
        },
        showDisplayName() {
            if (this.addMode) return false;
            const profile = this.$store.state.library && this.$store.state.library.publicProfile;
            return this.requestDisplayName || (this.$store.state.loggedIn && (!profile || !profile.displayName));
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
            return {
                ...this.setup,
                defaultListName: this.$t('library.newListDefault'),
            };
        },
        templateSummary(template) {
            const description = this.templateDescription(template);
            return templateWeightMg(template.data) > 0 ? `${description} (${this.templateWeight(template)})` : description;
        },
        onSelect(template) {
            if (this.addMode) {
                this.$emit('add', template, { listName: this.setup.listName, templateName: this.templateName(template) });
                return;
            }
            if (!this.validateSetup()) return;
            this.$emit('select', template.data, { ...this.getSetup(), listTypes: [...(template.listTypes || [])], durations: [...(template.durations || [])], seasons: [...(template.seasons || [])] });
        },
        onDismiss() {
            if (!this.validateSetup()) return;
            this.$emit('dismiss', this.getSetup());
        },
        validateSetup() {
            this.displayNameError = '';
            if (this.showDisplayName && isReservedDisplayName(this.setup.displayName)) {
                this.displayNameError = this.$t('auth.displayNameReserved');
                return false;
            }
            return true;
        },
        templateDescription(template) {
            return this.$t(`library.templatePickerTemplates.${template.id}.description`);
        },
        templateWeight(template) {
            const unit = this.setup.units === 'metric' ? 'kg' : 'lb';
            const value = weightUtils.MgToWeight(templateWeightMg(template.data), unit);
            return `${value} ${unit}`;
        },
        templateName(template) {
            return this.$t(`library.templatePickerTemplates.${template.id}.name`);
        },
    },
};
</script>
