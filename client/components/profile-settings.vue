<style lang="scss">
@import "../css/_globals";

.profileSettings {
    border-top: 1px solid $color-border;
    padding-top: 28px;
}

.profileSettingsSectionTitle {
    font-size: 18px;
    font-weight: $fontWeight-bold;
    margin: 0 0 16px;
}

.profileSettingsGrid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-bottom: 28px;
}

.profileSettingsField {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
}

.profileSettingsLabel {
    color: $color-text-muted;
    font-size: $fontSize-xs;
    font-weight: $fontWeight-bold;
    letter-spacing: $letterSpacing-caps;
    text-transform: uppercase;
}

.profileSettingsInput,
.profileSettingsTextarea {
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
}

.profileSettingsTextarea {
    min-height: 80px;
    padding: 10px 12px;
    resize: vertical;
}

.profileSettingsHint {
    color: $color-text-muted;
    font-size: $fontSize-xs;
    margin: 4px 0 0;
}

.profileSettingsAvatar {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
}

.profileSettingsAvatarPreview {
    align-items: center;
    background: $color-control-muted;
    border: 1px solid $color-border;
    border-radius: 50%;
    color: $color-text-muted;
    display: flex;
    flex-shrink: 0;
    font-size: 20px;
    font-weight: $fontWeight-bold;
    height: 56px;
    justify-content: center;
    overflow: hidden;
    width: 56px;

    img {
        height: 100%;
        object-fit: cover;
        width: 100%;
    }

    span {
        align-items: center;
        display: flex;
        height: 100%;
        justify-content: center;
        width: 100%;
    }
}

.profileSettingsAvatarActions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.profileSettingsAvatarBtn {
    cursor: pointer;
}

.profileSettingsAvatarError {
    color: $color-danger;
    font-size: $fontSize-xs;
    margin: 4px 0 0;
    width: 100%;
}

.profileSettingsActions {
    margin-bottom: 20px;
}

.profileSettingsCheckbox {
    align-items: center;
    color: $color-text;
    cursor: pointer;
    display: flex;
    font-size: $fontSize-sm;
    gap: 8px;
    margin-bottom: 28px;

    input[type="checkbox"] {
        accent-color: $color-accent;
        cursor: pointer;
        flex-shrink: 0;
        height: 15px;
        width: 15px;
    }
}

@media (max-width: 640px) {
    .profileSettingsGrid {
        grid-template-columns: 1fr;
    }
}
</style>

<template>
    <section class="profileSettings">
        <h3 class="profileSettingsSectionTitle">{{ $t('acct.defaultUnits') }}</h3>
        <div class="profileSettingsGrid">
            <div class="profileSettingsField">
                <span class="profileSettingsLabel">{{ $t('acct.itemWeight') }}</span>
                <lp-select :value="library.itemUnit" :options="unitOptions" @change="updateDefaultUnit('itemUnit', $event)" />
            </div>
            <div class="profileSettingsField">
                <span class="profileSettingsLabel">{{ $t('acct.listTotals') }}</span>
                <lp-select :value="library.totalUnit" :options="unitOptions" @change="updateDefaultUnit('totalUnit', $event)" />
            </div>
            <div class="profileSettingsField">
                <span class="profileSettingsLabel">{{ $t('acct.defaultCurrency') }}</span>
                <lp-select :value="library.currencySymbol" :options="currencyOptions" @change="updateCurrencySymbol($event)" />
            </div>
        </div>

        <h3 class="profileSettingsSectionTitle">{{ $t('acct.publicProfile') }}</h3>

        <div class="profileSettingsField">
            <span class="profileSettingsLabel">{{ $t('acct.avatar') }}</span>
            <div class="profileSettingsAvatar">
                <div class="profileSettingsAvatarPreview">
                    <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="avatar">
                    <span v-else :style="{ background: avatarBgColor, color: '#fff' }">{{ avatarLetter }}</span>
                </div>
                <template v-if="hasProfileCustomization">
                    <div class="profileSettingsAvatarActions">
                        <label class="lpButton lpSmall profileSettingsAvatarBtn">
                            {{ avatarUploading ? $t('acct.uploading') : $t('acct.uploadPhoto') }}
                            <input type="file" accept="image/*" style="display:none" :disabled="avatarUploading" @change="uploadAvatar">
                        </label>
                        <button v-if="profile.avatarUrl" class="lpButton lpSmall lpButtonGhost" @click="removeAvatar">{{ $t('acct.remove') }}</button>
                    </div>
                    <p v-if="avatarError" class="profileSettingsAvatarError">{{ avatarError }}</p>
                </template>
            </div>
        </div>

        <div class="profileSettingsField">
            <span class="profileSettingsLabel">{{ $t('acct.displayName') }}</span>
            <input type="text" class="profileSettingsInput" :value="profile.displayName" @input="update('displayName', $event.target.value)">
        </div>

        <template v-if="hasProfileCustomization">
            <div class="profileSettingsField">
                <span class="profileSettingsLabel">{{ $t('acct.trailName') }}</span>
                <input type="text" class="profileSettingsInput" :value="profile.trailName" @input="update('trailName', $event.target.value)">
            </div>
            <div class="profileSettingsField">
                <span class="profileSettingsLabel">{{ $t('acct.bio') }}</span>
                <textarea class="profileSettingsTextarea" :value="profile.bio" @input="update('bio', $event.target.value)" />
            </div>
        </template>

        <div class="profileSettingsField">
            <span class="profileSettingsLabel">{{ $t('acct.visibility') }}</span>
            <lp-select :value="profile.visibility" :options="visibilityOptions" @change="update('visibility', $event)" />
            <p v-if="visibilityHint" class="profileSettingsHint">{{ visibilityHint }}</p>
        </div>
        <div class="profileSettingsActions">
            <button class="lpButton" :disabled="profileSaving" @click="saveProfile">
                {{ profileSaved ? $t('acct.saved') : $t('acct.saveProfile') }}
            </button>
            <span v-if="profileError" class="profileSettingsAvatarError">{{ profileError }}</span>
        </div>
    </section>
</template>

<script>
import { fetchJson } from '../utils/utils';
import { hasFeature, FEATURES } from '../services/entitlements.js';
import { avatarColor, avatarInitial } from '../utils/avatar.js';
import LpSelect from './lp-select.vue';

export default {
    name: 'ProfileSettings',
    components: { LpSelect },
    data() {
        return {
            units: ['oz', 'lb', 'g', 'kg'],
            avatarUploading: false,
            avatarError: null,
            profileSaving: false,
            profileSaved: false,
            profileError: null,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        profile() {
            return this.$store.state.library.publicProfile;
        },
        username() {
            return this.$store.state.loggedIn;
        },
        hasProfileCustomization() {
            return hasFeature(this.library && this.library.entitlements, FEATURES.PROFILE_CUSTOMIZATION);
        },
        avatarBgColor() {
            return avatarColor(this.username);
        },
        avatarLetter() {
            return avatarInitial(this.profile && this.profile.displayName, this.username);
        },
        unitOptions() {
            return this.units.map(u => ({ value: u, label: u }));
        },
        currencyOptions() {
            return [
                { value: '$', label: '$ — Dollar' },
                { value: '€', label: '€ — Euro' },
            ];
        },
        visibilityOptions() {
            return [
                { value: 'private', label: this.$t('acct.visibilityPrivate') },
                { value: 'shareable', label: this.$t('acct.visibilityShareable') },
                { value: 'discoverable', label: this.$t('acct.visibilityDiscoverable') },
                { value: 'indexable', label: this.$t('acct.visibilityIndexable') },
            ];
        },
        visibilityHint() {
            const map = {
                private: this.$t('acct.visibilityHintPrivate'),
                shareable: this.$t('acct.visibilityHintShareable'),
                discoverable: this.$t('acct.visibilityHintDiscoverable'),
                indexable: this.$t('acct.visibilityHintIndexable'),
            };
            return map[this.profile && this.profile.visibility] || '';
        },
    },
    methods: {
        update(field, value) {
            this.$store.commit('updatePublicProfile', { [field]: value });
        },
        updateDefaultUnit(field, value) {
            this.$store.commit('setDefaultUnits', {
                itemUnit: field === 'itemUnit' ? value : this.library.itemUnit,
                totalUnit: field === 'totalUnit' ? value : this.library.totalUnit,
            });
        },
        updateCurrencySymbol(value) {
            this.$store.commit('updateCurrencySymbol', value);
        },
        async uploadAvatar(event) {
            const file = event.target.files[0];
            if (!file) return;
            this.avatarUploading = true;
            this.avatarError = null;
            try {
                const formData = new FormData();
                formData.append('image', file);
                const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Upload failed');
                this.$store.commit('updatePublicProfile', { avatarUrl: data.avatarUrl });
            } catch (e) {
                this.avatarError = e.message || 'Upload failed';
            } finally {
                this.avatarUploading = false;
                event.target.value = '';
            }
        },
        async saveProfile() {
            this.profileSaving = true;
            this.profileSaved = false;
            this.profileError = null;
            try {
                await fetchJson('/api/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        displayName: this.profile.displayName || '',
                        trailName: this.profile.trailName || '',
                        bio: this.profile.bio || '',
                        visibility: this.profile.visibility || 'private',
                        allowSearchIndexing: !!this.profile.allowSearchIndexing,
                    }),
                });
                this.profileSaved = true;
                setTimeout(() => { this.profileSaved = false; }, 2000);
            } catch {
                this.profileError = 'Failed to save profile';
            } finally {
                this.profileSaving = false;
            }
        },
        async removeAvatar() {
            try {
                await fetchJson('/api/profile/avatar', { method: 'DELETE' });
                this.$store.commit('updatePublicProfile', { avatarUrl: '' });
            } catch {
                this.avatarError = 'Failed to remove avatar';
            }
        },
    },
};
</script>
