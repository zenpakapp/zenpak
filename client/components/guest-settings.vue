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
    font-size: 13px;
    letter-spacing: 0.02em;
    padding: 4px 6px;

    &:hover { color: $color-text; }
}

.guestSettingsPopover {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    min-width: 180px;
    padding: 12px 14px;
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    z-index: 200;
}

.guestSettingsRow {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    margin-bottom: 8px;

    &:last-child { margin-bottom: 0; }
}

.guestSettingsLabel {
    color: $color-text-muted;
    font-size: 12px;
}

.guestSettingsSelect {
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text;
    font-size: 13px;
    padding: 3px 6px;
    cursor: pointer;

    &:focus { outline: none; border-color: $color-accent; }
}

.guestSettingsDivider {
    border: none;
    border-top: 1px solid $color-border;
    margin: 8px 0;
}

.guestSettingsListItem {
    cursor: pointer;
    font-size: 13px;
    padding: 3px 0;
    color: $color-text;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover { color: $color-accent; }

    &.lpActive {
        font-weight: 600;
    }
}
</style>

<template>
    <span class="guestSettings" v-click-outside="close">
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
