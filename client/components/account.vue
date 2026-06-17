<style lang="scss">
@import "../css/_globals";

#accountSettings {
    width: min(640px, calc(100vw - 32px));
}

.accountSettingsTitle {
    font-size: 20px;
    font-weight: $fontWeight-bold;
    margin: 0 0 24px;
}

.accountSection {
    border-bottom: 1px solid $color-border;
    margin-bottom: 28px;
    padding-bottom: 28px;
}

.accountSectionTitle {
    font-size: $fontSize-base;
    font-weight: $fontWeight-bold;
    margin: 0 0 8px;
}

.accountSectionText {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    margin: 0 0 14px;
}

.accountFieldGroup {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
}

.accountFieldGroupDivider {
    border: none;
    border-top: 1px solid $color-border;
    margin: 4px 0;
}

.accountField {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.accountFieldLabel {
    color: $color-text-muted;
    font-size: $fontSize-xs;
    font-weight: $fontWeight-bold;
    letter-spacing: $letterSpacing-caps;
    text-transform: uppercase;
}

.accountFieldInput {
    appearance: none;
    background: $color-bg;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    box-sizing: border-box;
    color: $color-text;
    font-family: $font-family-base;
    font-size: $fontSize-base;
    min-height: 40px;
    padding: 0 12px;
    width: 100%;

    &:focus {
        border-color: $color-accent;
        box-shadow: 0 0 0 4px rgba(var(--color-accent-rgb), 0.1);
        outline: none;
    }

    &:disabled {
        background: $color-control-muted;
        color: $color-text-muted;
        cursor: not-allowed;
    }
}

.accountActions {
    align-items: center;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 20px;

    .lpButton {
        min-width: 120px;
    }
}

.accountActionsRight {
    display: flex;
    gap: 12px;
    margin-left: auto;
}

.accountCancelLink {
    align-items: center;
    color: $color-text-muted;
    cursor: pointer;
    display: flex;
    font-size: $fontSize-sm;
    text-decoration: none;
    transition: color $transitionDurationFast ease;

    &:hover {
        color: $color-text;
    }
}

.accountDangerLink {
    align-items: center;
    color: $color-text-muted;
    cursor: pointer;
    display: flex;
    font-size: $fontSize-sm;
    text-decoration: none;
    transition: color $transitionDurationFast ease;

    &:hover {
        color: $color-danger;
    }
}

.accountBackupActions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.accountRestoreConfirm {
    background: rgba(var(--color-danger-rgb), 0.06);
    border: 1px solid rgba(var(--color-danger-rgb), 0.2);
    border-radius: $radius-md;
    margin-top: 14px;
    padding: 14px 16px;
}

.accountRestoreConfirmText {
    color: $color-text;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    margin: 0 0 12px;
}

.accountRestoreConfirmActions {
    align-items: center;
    display: flex;
    gap: 12px;
}

.lpButtonDanger {
    background: $color-danger;
    border-color: $color-danger;
    color: #fff;

    &:hover {
        filter: brightness(0.9);
    }
}

@media (max-width: 640px) {
    .accountActions {
        flex-direction: column;
        align-items: stretch;

        .lpButton {
            width: 100%;
        }

        .accountActionsRight {
            margin-left: 0;
            justify-content: space-between;
        }
    }
}
</style>

<template>
    <modal id="accountSettings" :shown="shown" @hide="shown = false">
        <h2 class="accountSettingsTitle">Account Settings</h2>

        <section class="accountSection">
            <form id="accountForm" @submit.prevent="updateAccount()">
                <div class="accountFieldGroup">
                    <div class="accountField">
                        <span class="accountFieldLabel">Username</span>
                        <input type="text" name="username" class="accountFieldInput" disabled :value="username">
                    </div>
                    <div class="accountField">
                        <span class="accountFieldLabel">Current password</span>
                        <input v-model="currentPassword" type="password" class="accountFieldInput" placeholder="Required to make changes" name="currentPassword">
                    </div>

                    <hr class="accountFieldGroupDivider">

                    <div class="accountField">
                        <span class="accountFieldLabel">New email</span>
                        <input v-model="newEmail" type="email" class="accountFieldInput" placeholder="Leave blank to keep current" name="newEmail">
                    </div>

                    <hr class="accountFieldGroupDivider">

                    <div class="accountField">
                        <span class="accountFieldLabel">New password</span>
                        <input v-model="newPassword" type="password" class="accountFieldInput" placeholder="Leave blank to keep current" name="newPassword">
                    </div>
                    <div class="accountField">
                        <span class="accountFieldLabel">Confirm new password</span>
                        <input v-model="confirmNewPassword" type="password" class="accountFieldInput" placeholder="Repeat new password" name="confirmNewPassword">
                    </div>
                </div>

                <errors :errors="errors" />

                <div class="accountActions">
                    <button class="lpButton">
                        Save changes
                        <spinner v-if="saving" />
                    </button>
                    <div class="accountActionsRight">
                        <a class="accountCancelLink" @click="shown = false">Cancel</a>
                        <a class="accountDangerLink" @click="showDeleteAccount">Delete account</a>
                    </div>
                </div>
            </form>
        </section>

        <section class="accountSection">
            <h3 class="accountSectionTitle">Library backup</h3>
            <template v-if="hasBackup">
                <p class="accountSectionText">Download or restore your full gear library.</p>
                <div class="accountBackupActions">
                    <button class="lpButton" @click="downloadBackup" :disabled="backupLoading">
                        {{ backupLoading ? 'Preparing…' : 'Download backup' }}
                    </button>
                    <button class="lpButton lpButtonSecondary" @click="triggerRestoreFile" :disabled="restoreLoading">
                        {{ restoreLoading ? 'Restoring…' : 'Restore from backup' }}
                    </button>
                </div>
                <div v-if="restoreConfirm" class="accountRestoreConfirm">
                    <p class="accountRestoreConfirmText">⚠ This will replace your entire library. This cannot be undone.</p>
                    <div class="accountRestoreConfirmActions">
                        <button class="lpButton lpButtonDanger" @click="confirmRestore">Yes, restore</button>
                        <a class="accountCancelLink" @click="restoreConfirm = false; restoreFile = null">Cancel</a>
                    </div>
                </div>
                <input ref="restoreInput" type="file" accept=".json" style="display:none" @change="onRestoreFile" />
            </template>
            <upgrade-prompt v-else tier="trail" feature="managedBackups" mode="inline" />
        </section>

        <profileSettings />
        <creatorLinks />
    </modal>
</template>

<script>
import errors from './errors.vue';
import modal from './modal.vue';
import spinner from './spinner.vue';
import profileSettings from './profile-settings.vue';
import creatorLinks from './creator-links.vue';
import upgradePrompt from './upgrade-prompt.vue';
import { openDialog, registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';
import { fetchJson } from '../utils/utils';
import { hasFeature, FEATURES } from '../services/entitlements.js';

export default {
    name: 'Account',
    components: {
        errors,
        modal,
        spinner,
        profileSettings,
        creatorLinks,
        upgradePrompt,
    },
    data() {
        return {
            saving: false,
            errors: [],
            currentPassword: '',
            newEmail: '',
            newPassword: '',
            confirmNewPassword: '',
            shown: false,
            backupLoading: false,
            restoreLoading: false,
            restoreConfirm: false,
            restoreFile: null,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        username() {
            return this.$store.state.loggedIn;
        },
        hasBackup() {
            return this.library && hasFeature(this.library.entitlements, FEATURES.MANAGED_BACKUPS);
        },
    },
    mounted() {
        registerDialogOpener('account', () => {
            this.shown = true;
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('account');
    },
    methods: {
        async downloadBackup() {
            this.backupLoading = true;
            try {
                const res = await fetch('/api/backup', { credentials: 'same-origin' });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const cd = res.headers.get('Content-Disposition') || '';
                const match = cd.match(/filename="([^"]+)"/);
                a.href = url;
                a.download = match ? match[1] : 'zenpak-backup.json';
                a.click();
                URL.revokeObjectURL(url);
            } catch {
                // silent — user sees nothing happened
            }
            this.backupLoading = false;
        },
        triggerRestoreFile() {
            this.$refs.restoreInput.value = '';
            this.$refs.restoreInput.click();
        },
        onRestoreFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            this.restoreFile = file;
            this.restoreConfirm = true;
        },
        async confirmRestore() {
            if (!this.restoreFile) return;
            this.restoreConfirm = false;
            this.restoreLoading = true;
            try {
                const text = await this.restoreFile.text();
                const data = JSON.parse(text);
                if (!data.library) throw new Error('Invalid backup file');
                await this.$store.dispatch('restoreFromBackup', data.library);
            } catch {
                // silent on parse/network errors
            }
            this.restoreFile = null;
            this.restoreLoading = false;
        },
        updateAccount() {
            this.errors = [];

            if (!this.currentPassword) {
                this.errors.push({ field: 'currentPassword', message: 'Please enter your current password.' });
            }

            if (this.newPassword && this.newPassword != this.confirmNewPassword) {
                this.errors.push({ field: 'newPassword', message: "Your passwords don't match." });
            }

            if (this.newPassword && (this.newPassword.length < 5 || this.newPassword.length > 60)) {
                this.errors.push({ field: 'newPassword', message: 'Please enter a password between 5 and 60 characters.' });
            }

            if (this.errors.length) {
                return;
            }

            const data = { username: this.username, currentPassword: this.currentPassword };

            let dirty = false;

            if (this.newPassword) {
                dirty = true;
                data.newPassword = this.newPassword;
            }
            if (this.newEmail) {
                dirty = true;
                data.newEmail = this.newEmail;
            }

            if (!dirty) return;

            this.currentPassword = '';
            this.saving = true;

            fetchJson('/account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(data),
            })
                .then((response) => {
                    this.saving = false;
                    this.shown = false;
                })
                .catch((err) => {
                    this.errors = err;
                    this.saving = false;
                });
        },
        showDeleteAccount() {
            this.shown = false;
            openDialog('deleteAccount');
        },
    },
};
</script>
