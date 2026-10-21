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

.accountDropdownAvatar {
    align-items: center;
    border-radius: 50%;
    color: #fff;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    height: 28px;
    justify-content: center;
    overflow: hidden;
    width: 28px;

    img {
        height: 100%;
        object-fit: cover;
        width: 100%;
    }
}

.accountDropdownName {
    // The account item no longer shrinks with the header, so a long name is cut here.
    max-width: 180px;
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

// On a phone the name is hidden and the avatar is the button: no room for a caret as well.
@media (max-width: 768px) {
    .accountDropdownCaret {
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

.accountDropdownUsernameHandle {
    color: $color-text-muted;
    display: block;
    font-size: $fontSize-xs;
    font-weight: $fontWeight-normal;
    letter-spacing: normal;
    margin-top: 1px;
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

html.lpSigningOut body::before {
    background: $color-bg;
    bottom: 0;
    content: "";
    left: 0;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 2147483647;
}
</style>

<template>
    <span class="headerItem hasPopover headerTruncateItem">
        <PopoverHover id="headerPopover" placement="right">
            <template #target>
                <span class="accountDropdownTarget" :title="username" :aria-label="accessibleName">
                    <span class="accountDropdownAvatar" :style="{ background: avatarUrl ? '#fff' : avatarBackground }">
                        <img v-if="avatarUrl" :src="avatarUrl" alt="" @error="avatarFailed = true">
                        <template v-else>
                            {{ avatarLetter }}
                        </template>
                    </span>
                    <strong class="accountDropdownName">{{ navLabel }}</strong>
                    <i class="lpSprite lpExpand accountDropdownCaret" />
                </span>
            </template>
            <template #content>
                <div class="accountDropdownMenu">
                    <div class="accountDropdownUser">
                        <span class="accountDropdownUsername">{{ navLabel }}</span>
                        <span v-if="displayName" class="accountDropdownUsernameHandle">@{{ username }}</span>
                    </div>
                    <a class="accountDropdownItem" role="button" tabindex="0" @click="showAccount" @keydown.enter="showAccount" @keydown.space.prevent="showAccount">{{ $t('dash.accountSettings') }}</a>
                    <router-link class="accountDropdownItem" :to="`/u/${username}`">{{ $t('dash.profileAndLists') }}</router-link>
                    <a class="accountDropdownItem" role="button" tabindex="0" @click="showHelp" @keydown.enter="showHelp" @keydown.space.prevent="showHelp">{{ $t('dash.help') }}</a>
                    <hr class="accountDropdownDivider">
                    <a class="accountDropdownItem accountDropdownDanger" role="button" tabindex="0" @click="signout" @keydown.enter="signout" @keydown.space.prevent="signout">{{ $t('dash.signOut') }}</a>
                </div>
            </template>
        </PopoverHover>
    </span>
</template>

<script>
import PopoverHover from './popover-hover.vue';
import { openDialog } from '../services/dialogs';
import { redirect } from '../services/navigation';
import { useTheme } from '../composables/useTheme';
import { avatarColor, avatarInitial } from '../utils/avatar';

export default {
    name: 'AccountDropdown',
    components: {
        PopoverHover,
    },
    setup() {
        const { mode, cycleTheme } = useTheme();
        return { mode, cycleTheme };
    },
    data() {
        return {
            // The photo failed to load: show the initial instead.
            avatarFailed: false,
        };
    },
    computed: {
        avatarUrl() {
            const profile = this.library && this.library.publicProfile;
            return (!this.avatarFailed && profile && profile.avatarUrl) || '';
        },
        avatarLetter() {
            return avatarInitial(this.displayName, this.username);
        },
        avatarBackground() {
            return avatarColor(this.username);
        },
        // The name can be hidden (header too narrow, phone), so the button carries it too.
        accessibleName() {
            return this.displayName ? `${this.displayName} (@${this.username})` : this.username;
        },
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
        displayName() {
            const lib = this.$store.state.library;
            const profile = lib && lib.publicProfile;
            return (this.isTrail && profile && profile.displayName) ? profile.displayName : '';
        },
        navLabel() {
            return this.displayName || this.username;
        },
        themeLabel() {
            return { auto: '⚙ Auto', light: '☀ Light', dark: '☾ Dark' }[this.mode];
        },
    },
    watch: {
        // A new upload gets its chance to load.
        'library.publicProfile.avatarUrl': function resetAvatarFailure() {
            this.avatarFailed = false;
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
            document.documentElement.classList.add('lpSigningOut');
            this.$store.commit('signout');
            redirect('/welcome');
        },
    },
};
</script>
