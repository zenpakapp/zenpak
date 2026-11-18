<style lang="scss">
@import "../css/_globals";

.guestSettings {
    display: inline-block;
    position: relative;
}

.guestSettingsBtn {
    background: none;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    font-size: $fontSize-ui;
    letter-spacing: 0.02em;
    padding: $space-4 $space-6;

    &:hover { color: $color-text; }
}

.guestSettingsPopover {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-lg;
    box-shadow: 0 4px 16px rgba(var(--color-shadow-rgb), 0.12);
    min-width: 180px;
    padding: $space-12 $space-14;
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    z-index: $dialog;
}

.guestSettingsRow {
    align-items: center;
    display: flex;
    gap: $space-8;
    justify-content: space-between;
    margin-bottom: $space-8;

    &:last-child { margin-bottom: 0; }
}

.guestSettingsLabel {
    color: $color-text-muted;
    font-size: $fontSize-sm;
}

.guestSettingsSelect {
    background: transparent;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    color: $color-text;
    cursor: pointer;
    font-size: $fontSize-ui;
    padding: $space-4 $space-6;

    &:focus {
        border-color: $color-accent;
        outline: none;
    }
}

.guestSettingsDivider {
    border: none;
    border-top: 1px solid $color-border;
    margin: $space-8 0;
}

.guestSettingsListItem {
    color: $color-text;
    cursor: pointer;
    font-size: $fontSize-ui;
    overflow: hidden;
    padding: $space-4 0;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover { color: $color-accent-text; }

    &.lpActive {
        font-weight: $fontWeight-bold;
    }
}
</style>

<template>
    <span v-click-outside="close" class="guestSettings">
        <button class="guestSettingsBtn" :title="$t('acct.defaultUnits')" @click="toggle">{{ library.itemUnit }} ▾</button>
        <div v-if="open" class="guestSettingsPopover">
            <div class="guestSettingsRow">
                <span class="guestSettingsLabel">{{ $t('acct.itemWeight') }}</span>
                <select class="guestSettingsSelect" :value="library.itemUnit" @change="setItemUnit($event.target.value)">
                    <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
                </select>
            </div>
            <div class="guestSettingsRow">
                <span class="guestSettingsLabel">{{ $t('acct.listTotals') }}</span>
                <select class="guestSettingsSelect" :value="library.totalUnit" @change="setTotalUnit($event.target.value)">
                    <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
                </select>
            </div>
            <hr class="guestSettingsDivider">
            <div v-for="list in library.lists" :key="list.id" class="guestSettingsListItem" :class="{ lpActive: library.defaultListId === list.id }" @click="switchList(list)">
                {{ list.name || $t('library.newListDefault') }}
            </div>
        </div>
    </span>
</template>

<script>
export default {
    name: 'GuestSettings',
    data() {
        return {
            open: false,
            units: ['oz', 'lb', 'g', 'kg'],
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
    },
    methods: {
        toggle() {
            this.open = !this.open;
        },
        close() {
            this.open = false;
        },
        setItemUnit(value) {
            this.$store.commit('setDefaultUnits', {
                itemUnit: value,
                totalUnit: this.library.totalUnit,
            });
        },
        setTotalUnit(value) {
            this.$store.commit('setDefaultUnits', {
                itemUnit: this.library.itemUnit,
                totalUnit: value,
            });
        },
        switchList(list) {
            this.$store.commit('setDefaultList', list);
            this.open = false;
        },
    },
};
</script>
