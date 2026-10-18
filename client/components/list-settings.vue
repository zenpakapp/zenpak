<style lang="scss">
@import "../css/_globals";

#csvUrl {
    display: block;
    margin-top: 15px;
}

#lpOptionalFields {
    margin: 0;
    padding: 0;
}

.lpOptionalField {
    list-style-type: none;
    margin: 0 0 2px;
    padding: 0;

    label {
        align-items: center;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        gap: 12px;
        padding: 9px 10px;
        transition: background-color 0.1s ease, color 0.1s ease;
    }

    &:hover label {
        background: rgba(var(--color-accent-rgb), 0.07);
        color: var(--color-accent);
    }

    input {
        accent-color: $color-accent;
        flex: 0 0 auto;
    }
}

#lpPriceSettings {
    align-items: center;
    display: flex;
    gap: 10px;
    justify-content: space-between;

    label {
        align-items: center;
        color: $color-text-muted;
        display: flex;
        font-size: $fontSize-sm;
        font-weight: $fontWeight-bold;
        gap: 10px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    input {
        border: 1px solid rgba(var(--color-accent-rgb), 0.16);
        border-radius: 10px;
        display: inline-block;
        font-size: $fontSize-md;
        font-weight: $fontWeight-medium;
        margin-left: 0;
        padding: 8px 10px;
        width: 64px;

        &:focus {
            border-color: $color-accent;
            box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.12);
            outline: none;
        }
    }
}

#share .lpContent {
    width: 330px;
}

#settings .lpContent {
    width: 280px;
}
</style>

<template>
    <span v-if="isSignedIn" id="settings" class="headerItem hasPopover headerTruncateItem">
        <PopoverHover>
            <template #target><span :title="$t('list.settings')"><svg class="lpHeaderIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> <span class="headerMenuLabel">{{ $t('list.settings') }}</span></span></template>
            <template #content><div>
                <ul id="lpOptionalFields">
                    <li v-for="optionalField in optionalFieldsLookup" :key="optionalField.name" class="lpOptionalField">
                        <label>
                            <input :checked="optionalField.value" type="checkbox" @change="toggleOptionalField(optionalField.name)">
                            {{ optionalField.displayName }}
                        </label>
                    </li>
                </ul>
                <div v-if="library.optionalFields['price']" id="lpPriceSettings">
                    <hr>
                    <label>
                        {{ $t('list.currency') }} :
                        <input id="currencySymbol" type="text" maxlength="4" :value="library.currencySymbol" @input="updateCurrencySymbol($event)">
                    </label>
                </div>
            </div></template>
        </PopoverHover>
    </span>
</template>

<script>
import PopoverHover from './popover-hover.vue';

export default {
    name: 'ListSettings',
    components: {
        PopoverHover,
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        isSignedIn() {
            return this.$store.state.loggedIn;
        },
        optionalFieldsLookup() {
            return [{
                name: 'images',
                displayName: this.$t('list.optFieldImages'),
                cssClass: 'lpShowImages',
            }, {
                name: 'price',
                displayName: this.$t('list.optFieldPrices'),
                cssClass: 'lpShowPrices',
            }, {
                name: 'worn',
                displayName: this.$t('list.optFieldWorn'),
                cssClass: 'lpShowWorn',
            }, {
                name: 'consumable',
                displayName: this.$t('list.optFieldConsumable'),
                cssClass: 'lpShowConsumable',
            }, {
                name: 'listDescription',
                displayName: this.$t('list.optFieldListDescription'),
                cssClass: 'lpShowListDescription',
            }].map((optionalField) => ({
                ...optionalField,
                value: this.library.optionalFields[optionalField.name],
            }));
        },
    },
    methods: {
        toggleOptionalField(optionalField) {
            this.$store.commit('toggleOptionalField', optionalField);
        },
        updateCurrencySymbol(evt) {
            this.$store.commit('updateCurrencySymbol', evt.target.value);
        },
    },
};
</script>
