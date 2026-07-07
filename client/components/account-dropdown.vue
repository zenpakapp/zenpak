<style lang="scss">
@import "../css/_globals";

.accountDropdownTarget {
    align-items: center;
    display: inline-flex;
    gap: 8px;
    max-width: 100%;
    min-width: 0;
}

.accountDropdownLead {
    flex: 0 0 auto;
    white-space: nowrap;
}

.accountDropdownName {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.accountDropdownCaret {
    flex: 0 0 auto;
}

@media (max-width: 1240px) {
    .accountDropdownLead {
        display: none;
    }
}

.accountDropdownMenu {
    display: flex;
    flex-direction: column;
    min-width: 180px;
    padding: 4px 0;
}

.accountDropdownUser {
    border-bottom: 1px solid $color-border;
    color: $color-text-muted;
    font-size: $fontSize-xs;
    font-weight: $fontWeight-bold;
    letter-spacing: $letterSpacing-caps;
    margin-bottom: 4px;
    padding: 4px 14px 10px;
    text-transform: uppercase;
}

.accountDropdownUsername {
    color: $color-text;
    display: block;
    font-size: $fontSize-base;
    font-weight: $fontWeight-bold;
    letter-spacing: normal;
    margin-top: 2px;
    text-transform: none;
}

.accountDropdownItem {
    align-items: center;
    border-radius: $radius-sm;
    color: $color-text;
    cursor: pointer;
    display: flex;
    font-size: $fontSize-sm;
    gap: 8px;
    margin: 0 4px;
    padding: 8px 10px;
    text-decoration: none;
    transition: background $transitionDurationFast ease, color $transitionDurationFast ease;

    &:hover {
        background: rgba(var(--color-accent-rgb), 0.08);
        color: $color-accent;
    }

    &.accountDropdownDanger {
        color: $color-text-muted;

        &:hover {
            background: rgba(220, 53, 69, 0.08);
            color: #dc3545;
        }
    }
}

.accountThemeToggle {
    color: $color-text-muted;
    cursor: pointer;
    font-size: 16px;
    padding: 0 8px 0 0;

    &:hover {
        color: $color-text;
    }
}

.accountDropdownDivider {
    border: none;
    border-top: 1px solid $color-border;
    margin: 4px 0;
}
</style>

<template>
    <span class="headerItem hasPopover headerTruncateItem">
        <PopoverHover id="headerPopover">
            <template #target>
                <span class="accountDropdownTarget" :title="username">
                    <span class="accountDropdownLead">{{ $t('dash.signedInAs') }}</span>
                    <strong class="accountDropdownName">{{ username }}</strong>
                    <i class="lpSprite lpExpand accountDropdownCaret" />
                </span>
            </template>
            <template #content>
                <div class="accountDropdownMenu">
                    <div class="accountDropdownUser">
                        {{ $t('dash.signedInAs') }}
                        <span class="accountDropdownUsername">{{ username }}</span>
                    </div>
                    <a class="accountDropdownItem" @click="showAccount">{{ $t('dash.accountSettings') }}</a>
                    <router-link v-if="isTrail" class="accountDropdownItem" :to="`/u/${username}`">{{ $t('dash.myProfile') }}</router-link>
                    <a class="accountDropdownItem" @click="showHelp">{{ $t('dash.help') }}</a>
                    <hr class="accountDropdownDivider">
                    <a class="accountDropdownItem accountDropdownDanger" @click="signout">{{ $t('dash.signOut') }}</a>
                </div>
            </template>
        </PopoverHover>
    </span>
</template>

<script>
import PopoverHover from './popover-hover.vue';
import { openDialog } from '../services/dialogs';
import { useTheme } from '../composables/useTheme.js';

export default {
    name: 'AccountDropdown',
    components: {
        PopoverHover,
    },
    setup() {
        const { mode, cycleTheme } = useTheme();
        return { mode, cycleTheme };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        username() {
            return this.$store.state.loggedIn;
        },
        isTrail() {
            const lib = this.$store.state.library;
            const plan = lib && lib.entitlements && lib.entitlements.plan;
            return plan === 'supporter' || plan === 'creator';
        },
        themeLabel() {
            return { auto: '⚙ Auto', light: '☀ Light', dark: '☾ Dark' }[this.mode];
        },
    },
    methods: {
        showAccount() {
            openDialog('account');
        },
        showHelp() {
            openDialog('help');
        },
        signout() {
            this.$store.commit('signout');
            this.$router.push('/welcome');
        },
    },
};
</script>
