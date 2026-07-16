<style lang="scss">
@import "../css/_share";
</style>

<template>
    <span v-if="isSignedIn" class="headerItem hasPopover headerTruncateItem">
        <PopoverHover id="share" @shown="focusShare">
            <template #target><span title="Share"><i class="lpSprite lpLink" /> <span class="headerMenuLabel">{{ $t('share.share') }}</span></span></template>
            <template #content>
                <div class="sharePopover">
                    <div class="shareSection">
                        <div class="shareLabel">{{ $t('share.shareLink') }}</div>
                        <input id="shareUrl" ref="shareUrlInput" v-select-on-focus type="text" class="shareInput" :value="shareUrl" readonly>
                    </div>

                    <div class="shareSection">
                        <div class="shareLabel">{{ $t('share.visibility') }}</div>
                        <div class="shareSelectWrap">
                            <select id="listVisibility" class="shareSelect" :value="list.visibility" @change="setVisibility($event.target.value)">
                                <option value="private">{{ $t('share.private') }}</option>
                                <option value="shareable">{{ $t('share.unlisted') }}</option>
                                <option value="discoverable">{{ $t('share.public') }}</option>
                                <option value="indexable">{{ $t('share.publicSearch') }}</option>
                            </select>
                        </div>
                        <p class="shareVisibilityHint">{{ visibilityHint }}</p>
                    </div>

                    <div class="shareSection">
                        <div class="shareLabel">{{ $t('share.communityTags') }}</div>
                        <div class="shareTagGroup" aria-label="Seasons">
                            <label v-for="season in seasonOptions" :key="season.value" class="shareTagCheckbox">
                                <input
                                    type="checkbox"
                                    :checked="selectedSeasons.includes(season.value)"
                                    @change="toggleDiscoveryTag('seasons', season.value, $event.target.checked)"
                                >
                                {{ season.label }}
                            </label>
                        </div>
                        <div class="shareTagGroup" aria-label="List types">
                            <label v-for="listType in listTypeOptions" :key="listType.value" class="shareTagCheckbox">
                                <input
                                    type="checkbox"
                                    :checked="selectedListTypes.includes(listType.value)"
                                    @change="toggleDiscoveryTag('listTypes', listType.value, $event.target.checked)"
                                >
                                {{ listType.label }}
                            </label>
                        </div>
                    </div>

                    <div class="shareSection">
                        <div class="shareLabel">{{ $t('share.sharedView') }}</div>
                        <label class="shareCheckbox">
                            <input type="checkbox" :checked="list.publicFields && list.publicFields.price" @change="setPublicField('price', $event.target.checked)">
                            {{ $t('share.showPrices') }}
                        </label>
                        <label class="shareCheckbox">
                            <input type="checkbox" :checked="list.publicFields && list.publicFields.links" @change="setPublicField('links', $event.target.checked)">
                            {{ $t('share.showGetItLinks') }}
                        </label>
                        <label class="shareCheckbox">
                            <input type="checkbox" :checked="list.publicFields && list.publicFields.images" @change="setPublicField('images', $event.target.checked)">
                            {{ $t('share.showImages') }}
                        </label>
                        <label class="shareCheckbox">
                            <input type="checkbox" :checked="list.publicFields && list.publicFields.downloadable" @change="setPublicField('downloadable', $event.target.checked)">
                            {{ $t('share.allowCsvDownload') }}
                        </label>
                    </div>

                    <div class="shareSection">
                        <div class="shareLabel">{{ $t('share.embed') }}</div>
                        <textarea v-select-on-focus class="shareTextarea" readonly>&lt;script src="{{ this.baseUrl }}/e/{{ this.externalId }}"&gt;&lt;/script&gt;&lt;div id="{{ this.externalId }}"&gt;&lt;/div&gt;</textarea>
                    </div>

                    <hr class="shareDivider">

                    <div class="shareFooter">
                        <a :href="csvUrl" target="_blank" class="shareCsvLink">
                            <i class="lpSprite lpSpriteDownload" /> {{ $t('share.exportToCsv') }}
                        </a>
                    </div>
                </div>
            </template>
        </PopoverHover>
    </span>
</template>

<script>
import PopoverHover from './popover-hover.vue';
import { showGlobalAlert } from '../services/user-feedback';
import { fetchJson } from '../utils/utils';

export default {
    name: 'Share',
    components: {
        PopoverHover,
    },
    data() {
        return {
            shareReady: true,
            seasonOptions: [
                { value: '3-season', label: '3-Season' },
                { value: '4-season', label: '4-Season' },
                { value: 'spring', label: 'Spring' },
                { value: 'summer', label: 'Summer' },
                { value: 'fall', label: 'Fall' },
                { value: 'winter', label: 'Winter' },
            ],
        };
    },
    computed: {
        listTypeOptions() {
            return [
                { value: 'day-hike', label: this.$t('list.typeDay') },
                { value: 'weekend', label: this.$t('list.typeWeekend') },
                { value: 'trek', label: this.$t('list.typeThru') },
                { value: 'bikepacking', label: this.$t('list.typeBike') },
            ];
        },
        visibilityHint() {
            const hints = {
                private: this.$t('share.hintPrivate'),
                shareable: this.$t('share.hintUnlisted'),
                discoverable: this.$t('share.hintDiscoverable'),
                indexable: this.$t('share.hintIndexable'),
            };
            return hints[this.list && this.list.visibility] || '';
        },
        library() {
            return this.$store.state.library;
        },
        list() {
            return this.library.getListById(this.library.defaultListId);
        },
        isSignedIn() {
            return this.$store.state.loggedIn;
        },
        externalId() {
            return this.list.externalId || '';
        },
        baseUrl() {
            const location = window.location;
            return location.origin ? location.origin : `${location.protocol}//${location.hostname}`;
        },
        shareUrl() {
            if (this.externalId && this.shareReady) {
                return `${this.baseUrl}/p/${this.externalId}`;
            }
            return '';
        },
        csvUrl() {
            if (this.externalId) {
                return `${this.baseUrl}/csv/${this.externalId}`;
            }
            return '';
        },
        selectedSeasons() {
            return Array.isArray(this.list.seasons) ? this.list.seasons : [];
        },
        selectedListTypes() {
            return Array.isArray(this.list.listTypes) ? this.list.listTypes : [];
        },
    },
    methods: {
        selectShareUrl() {
            this.$nextTick(() => {
                if (this.$refs.shareUrlInput) {
                    this.$refs.shareUrlInput.select();
                }
            });
        },
        setPublicField(field, value) {
            this.$store.commit('updateListPublicFields', {
                listId: this.list.id,
                [field]: value,
            });
            return this.saveShareState().catch(() => {
                showGlobalAlert(this.$t('share.errorSavingSettings'));
            });
        },
        setVisibility(visibility) {
            this.$store.commit('updateListVisibility', {
                listId: this.list.id,
                visibility,
                allowSearchIndexing: visibility === 'indexable' && this.list.allowSearchIndexing,
            });
            return this.saveShareState().catch((err) => {
                showGlobalAlert((err && err.message) || this.$t('share.errorSavingSettingsDetail'));
            });
        },
        toggleDiscoveryTag(field, value, checked) {
            const seasons = [...this.selectedSeasons];
            const listTypes = [...this.selectedListTypes];
            const target = field === 'seasons' ? seasons : listTypes;
            const index = target.indexOf(value);
            if (checked && index === -1) target.push(value);
            if (!checked && index !== -1) target.splice(index, 1);

            this.$store.commit('updateListDiscoveryTags', {
                listId: this.list.id,
                seasons,
                listTypes,
            });
            return this.saveShareState().catch(() => {
                showGlobalAlert(this.$t('share.errorSavingTags'));
            });
        },
        setSearchIndexing(allowSearchIndexing) {
            this.$store.commit('updateListVisibility', {
                listId: this.list.id,
                visibility: allowSearchIndexing ? 'indexable' : this.list.visibility,
                allowSearchIndexing,
            });
            return this.saveShareState().catch((err) => {
                showGlobalAlert((err && err.message) || this.$t('share.errorSavingSettingsDetail'));
            });
        },
        focusShare() {
            if (!this.list.externalId) {
                this.shareReady = false;
                return fetchJson('/externalId', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'same-origin',
                })
                    .then((response) => {
                        this.$store.commit('setExternalId', { externalId: response.externalId, list: this.list });
                        return this.saveShareState();
                    })
                    .then(() => {
                        this.shareReady = true;
                        this.selectShareUrl();
                    })
                    .catch((err) => {
                        showGlobalAlert((err && err.message) || this.$t('share.errorGettingId'));
                    });
            }
            this.shareReady = false;
            return this.saveShareState()
                .then(() => {
                    this.shareReady = true;
                    this.selectShareUrl();
                })
                .catch(() => {
                    showGlobalAlert(this.$t('share.errorSavingSettingsDetail'));
                });
        },
        ensureShareable() {
            if (this.list.visibility === 'private') {
                this.$store.commit('updateListVisibility', {
                    listId: this.list.id,
                    visibility: 'shareable',
                    allowSearchIndexing: false,
                });
            }
        },
        saveShareState() {
            if (this.$store.state.saveType !== 'remote' || !this.$store.state.loggedIn) {
                return Promise.resolve();
            }

            if (this.$store.state.isSaving) {
                return new Promise((resolve, reject) => {
                    const unwatch = this.$store.watch(
                        (state) => state.isSaving,
                        (isSaving) => {
                            if (!isSaving) {
                                unwatch();
                                this.saveShareState().then(resolve).catch(reject);
                            }
                        },
                    );
                });
            }

            const saveData = JSON.stringify(this.library.save());

            if (saveData === this.$store.state.lastSaveData) {
                return Promise.resolve();
            }

            this.$store.commit('setIsSaving', true);
            this.$store.commit('setLastSaveData', saveData);

            return fetchJson('/saveLibrary/', {
                method: 'POST',
                body: JSON.stringify({
                    syncToken: this.$store.state.syncToken,
                    username: this.$store.state.loggedIn,
                    data: saveData,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
            })
                .then((response) => {
                    this.$store.commit('setSyncToken', response.syncToken);
                    this.$store.commit('setIsSaving', false);
                })
                .catch((error) => {
                    this.$store.commit('setIsSaving', false);
                    throw error;
                });
        },
    },
};
</script>
