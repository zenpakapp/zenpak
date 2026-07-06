<style lang="scss">
@import "../css/_share";
</style>

<template>
    <span v-if="isSignedIn" class="headerItem hasPopover headerTruncateItem">
        <PopoverHover id="share" @shown="focusShare">
            <template #target><span title="Share"><i class="lpSprite lpLink" /> <span class="headerMenuLabel">Share</span></span></template>
            <template #content>
                <div class="sharePopover">
                    <div class="shareSection">
                        <div class="shareLabel">Share link</div>
                        <input id="shareUrl" ref="shareUrlInput" v-select-on-focus type="text" class="shareInput" :value="shareUrl" readonly>
                    </div>

                    <div class="shareSection">
                        <div class="shareLabel">Visibility</div>
                        <div class="shareSelectWrap">
                            <select id="listVisibility" class="shareSelect" :value="list.visibility" @change="setVisibility($event.target.value)">
                                <option value="private">Private</option>
                                <option value="shareable">Unlisted</option>
                                <option value="discoverable">Public</option>
                                <option value="indexable">Public + Search engines</option>
                            </select>
                        </div>
                        <p class="shareVisibilityHint">{{ visibilityHint }}</p>
                    </div>

                    <div class="shareSection">
                        <div class="shareLabel">Community tags</div>
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
                        <div class="shareLabel">Shared view</div>
                        <label class="shareCheckbox">
                            <input type="checkbox" :checked="list.publicFields && list.publicFields.price" @change="setPublicField('price', $event.target.checked)">
                            Show prices
                        </label>
                        <label class="shareCheckbox">
                            <input type="checkbox" :checked="list.publicFields && list.publicFields.links" @change="setPublicField('links', $event.target.checked)">
                            Show "Get it" links
                        </label>
                        <label class="shareCheckbox">
                            <input type="checkbox" :checked="list.publicFields && list.publicFields.images" @change="setPublicField('images', $event.target.checked)">
                            Show images
                        </label>
                        <label class="shareCheckbox">
                            <input type="checkbox" :checked="list.publicFields && list.publicFields.downloadable" @change="setPublicField('downloadable', $event.target.checked)">
                            Allow CSV download
                        </label>
                    </div>

                    <div class="shareSection">
                        <div class="shareLabel">Embed</div>
                        <textarea v-select-on-focus class="shareTextarea" readonly>&lt;script src="{{ this.baseUrl }}/e/{{ this.externalId }}"&gt;&lt;/script&gt;&lt;div id="{{ this.externalId }}"&gt;&lt;/div&gt;</textarea>
                    </div>

                    <hr class="shareDivider">

                    <div class="shareFooter">
                        <a :href="csvUrl" target="_blank" class="shareCsvLink">
                            <i class="lpSprite lpSpriteDownload" /> Export to CSV
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
            listTypeOptions: [
                { value: 'day-hike', label: 'Day hike' },
                { value: 'weekend', label: 'Weekend' },
                { value: 'thru-hike', label: 'Thru-hike' },
                { value: 'bikepacking', label: 'Bikepacking' },
            ],
        };
    },
    computed: {
        visibilityHint() {
            const hints = {
                private: 'Only you can see this list.',
                shareable: 'Anyone with the link can view it. Won\'t appear on your profile or in feeds.',
                discoverable: 'Visible on your profile and in your followers\' feed.',
                indexable: 'Visible on your profile, in feeds, and indexed by search engines.',
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
                showGlobalAlert('An error occurred while saving your sharing settings. Please try again later.');
            });
        },
        setVisibility(visibility) {
            this.$store.commit('updateListVisibility', {
                listId: this.list.id,
                visibility,
                allowSearchIndexing: visibility === 'indexable' && this.list.allowSearchIndexing,
            });
            return this.saveShareState().catch((err) => {
                showGlobalAlert((err && err.message) || 'An error occurred while attempting to save your sharing settings. Please try again later.');
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
                showGlobalAlert('An error occurred while saving your community tags. Please try again later.');
            });
        },
        setSearchIndexing(allowSearchIndexing) {
            this.$store.commit('updateListVisibility', {
                listId: this.list.id,
                visibility: allowSearchIndexing ? 'indexable' : this.list.visibility,
                allowSearchIndexing,
            });
            return this.saveShareState().catch((err) => {
                showGlobalAlert((err && err.message) || 'An error occurred while attempting to save your sharing settings. Please try again later.');
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
                        showGlobalAlert((err && err.message) || 'An error occurred while attempting to get an ID for your list. Please try again later.');
                    });
            }
            this.shareReady = false;
            return this.saveShareState()
                .then(() => {
                    this.shareReady = true;
                    this.selectShareUrl();
                })
                .catch(() => {
                    showGlobalAlert('An error occurred while attempting to save your sharing settings. Please try again later.');
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
