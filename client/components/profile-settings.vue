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
.profileSettingsSelect,
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

.profileSettingsSelectWrap {
    position: relative;

    &::after {
        color: $color-text-muted;
        content: "⌄";
        font-size: 18px;
        line-height: 1;
        pointer-events: none;
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-54%);
    }
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
        <h3 class="profileSettingsSectionTitle">Default units</h3>
        <div class="profileSettingsGrid">
            <div class="profileSettingsField">
                <span class="profileSettingsLabel">Item weight</span>
                <div class="profileSettingsSelectWrap">
                    <select class="profileSettingsSelect" :value="library.itemUnit" @change="updateDefaultUnit('itemUnit', $event.target.value)">
                        <option v-for="unit in units" :key="unit" :value="unit">{{ unit }}</option>
                    </select>
                </div>
            </div>
            <div class="profileSettingsField">
                <span class="profileSettingsLabel">List totals</span>
                <div class="profileSettingsSelectWrap">
                    <select class="profileSettingsSelect" :value="library.totalUnit" @change="updateDefaultUnit('totalUnit', $event.target.value)">
                        <option v-for="unit in units" :key="unit" :value="unit">{{ unit }}</option>
                    </select>
                </div>
            </div>
            <div class="profileSettingsField">
                <span class="profileSettingsLabel">Default currency</span>
                <input
                    type="text"
                    class="profileSettingsInput"
                    maxlength="4"
                    :value="library.currencySymbol"
                    @input="updateCurrencySymbol($event.target.value)"
                >
            </div>
        </div>

        <h3 class="profileSettingsSectionTitle">Public profile</h3>
        <div class="profileSettingsField">
            <span class="profileSettingsLabel">Avatar</span>
            <div class="profileSettingsAvatar">
                <div class="profileSettingsAvatarPreview">
                    <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="avatar">
                    <span v-else>{{ (profile.displayName || username || '?').charAt(0).toUpperCase() }}</span>
                </div>
                <div class="profileSettingsAvatarActions">
                    <label class="lpButton lpSmall profileSettingsAvatarBtn">
                        {{ avatarUploading ? 'Uploading…' : 'Upload photo' }}
                        <input type="file" accept="image/*" style="display:none" :disabled="avatarUploading" @change="uploadAvatar">
                    </label>
                    <button v-if="profile.avatarUrl" class="lpButton lpSmall lpButtonGhost" @click="removeAvatar">Remove</button>
                </div>
                <p v-if="avatarError" class="profileSettingsAvatarError">{{ avatarError }}</p>
            </div>
        </div>
        <div class="profileSettingsField">
            <span class="profileSettingsLabel">Display name</span>
            <input type="text" class="profileSettingsInput" :value="profile.displayName" @input="update('displayName', $event.target.value)">
        </div>
        <div class="profileSettingsField">
            <span class="profileSettingsLabel">Trail name</span>
            <input type="text" class="profileSettingsInput" :value="profile.trailName" @input="update('trailName', $event.target.value)">
        </div>
        <div class="profileSettingsField">
            <span class="profileSettingsLabel">Bio</span>
            <textarea class="profileSettingsTextarea" :value="profile.bio" @input="update('bio', $event.target.value)" />
        </div>
        <div class="profileSettingsField">
            <span class="profileSettingsLabel">Visibility</span>
            <div class="profileSettingsSelectWrap">
                <select class="profileSettingsSelect" :value="profile.visibility" @change="update('visibility', $event.target.value)">
                    <option value="private">Private</option>
                    <option value="shareable">Shareable</option>
                    <option value="discoverable">Discoverable</option>
                    <option value="indexable">Indexable</option>
                </select>
            </div>
        </div>
        <label class="profileSettingsCheckbox">
            <input type="checkbox" :checked="profile.allowSearchIndexing" @change="update('allowSearchIndexing', $event.target.checked)">
            Allow search indexing
        </label>
    </section>
</template>

<script>
import { fetchJson } from '../utils/utils';

export default {
    name: 'ProfileSettings',
    data() {
        return {
            units: ['oz', 'lb', 'g', 'kg'],
            avatarUploading: false,
            avatarError: null,
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
