<style lang="scss">
@import "../css/_share";
</style>

<template>
    <span v-if="isSignedIn" class="headerItem hasPopover headerTruncateItem">
        <PopoverHover id="share" @shown="focusShare">
            <template #target>
                <span :title="$t('share.share')"><i class="lpSprite lpLink" /> <span class="headerMenuLabel">{{ $t('share.share') }}</span>
                    <span v-if="publishStateLabel" class="sharePublishState" :class="{ sharePublishStateDirty: publishStateDirty }">{{ publishStateLabel }}</span>
                </span>
            </template>
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

                    <div v-if="isShared" class="shareSection">
                        <div class="shareLabel">{{ $t('share.publishTitle') }}</div>
                        <p class="shareVisibilityHint">{{ $t('share.publishHint') }}</p>
                        <input v-model="publishNote" type="text" class="shareInput" maxlength="200" :placeholder="$t('share.publishNotePlaceholder')" :disabled="publishing">
                        <button type="button" class="sharePublishButton" :disabled="publishing" @click="publish">
                            {{ publishing ? $t('share.publishing') : $t('share.publish') }}
                        </button>
                    </div>

                    <div v-if="list.visibility === 'shareable'" class="shareSection">
                        <label class="shareCheckbox">
                            <input type="checkbox" :checked="list.copyable" @change="setCopyable($event.target.checked)">
                            {{ $t('public.allowCopy') }}
                        </label>
                        <p class="shareVisibilityHint">{{ $t('public.allowCopyHint') }}</p>
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
import { LIST_TYPE_VALUES, SEASON_VALUES, toI18nOptions } from '../data/list-type-options';

export default {
    name: 'Share',
    components: {
        PopoverHover,
    },
    data() {
        return {
            shareReady: true,
            publishStatus: { latestVersion: 0, publishedAt: null, hasUnpublishedChanges: false },
            publishNote: '',
            publishing: false,
            statusTimer: null,
        };
    },
    computed: {
        seasonOptions() {
            return toI18nOptions(SEASON_VALUES, (key) => this.$t(key));
        },
        listTypeOptions() {
            return toI18nOptions(LIST_TYPE_VALUES, (key) => this.$t(key));
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
        isShared() {
            return Boolean(this.list && this.list.visibility && this.list.visibility !== 'private');
        },
        publishStateLabel() {
            if (!this.isShared || !this.list.externalId) return '';
            if (!this.publishStatus.latestVersion) return this.$t('share.notPublished');
            if (this.publishStatus.hasUnpublishedChanges) return this.$t('share.unpublishedChanges');
            return this.$t('share.publishedVersion', { version: this.publishStatus.latestVersion });
        },
        publishStateDirty() {
            return !this.publishStatus.latestVersion || this.publishStatus.hasUnpublishedChanges;
        },
    },
    watch: {
        '$store.state.syncToken': 'scheduleStatusRefresh',
        'list.externalId': 'scheduleStatusRefresh',
        'list.visibility': 'scheduleStatusRefresh',
    },
    mounted() {
        this.refreshPublishStatus();
    },
    beforeUnmount() {
        clearTimeout(this.statusTimer);
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
            return this.saveShareState().catch((err) => {
                if (err && err.message) return;
                showGlobalAlert(this.$t('share.errorSavingSettings'));
            });
        },
        setVisibility(visibility) {
            this.$store.commit('updateListVisibility', {
                listId: this.list.id,
                visibility,
                allowSearchIndexing: visibility === 'indexable' && this.list.allowSearchIndexing,
            });
            return this.saveShareState()
                .then(() => this.ensurePublished())
                .catch((err) => {
                    showGlobalAlert((err && err.message) || this.$t('share.errorSavingSettingsDetail'));
                });
        },
        setCopyable(copyable) {
            this.$store.commit('updateListCopyable', {
                listId: this.list.id,
                copyable,
            });
            return this.saveShareState().catch((err) => {
                if (err && err.message) return;
                showGlobalAlert(this.$t('share.errorSavingSettings'));
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
            return this.saveShareState().catch((err) => {
                if (err && err.message) return;
                showGlobalAlert(this.$t('share.errorSavingTags'));
            });
        },
        setSearchIndexing(allowSearchIndexing) {
            this.$store.commit('updateListVisibility', {
                listId: this.list.id,
                visibility: allowSearchIndexing ? 'indexable' : this.list.visibility,
                allowSearchIndexing,
            });
            return this.saveShareState()
                .then(() => this.ensurePublished())
                .catch((err) => {
                    showGlobalAlert((err && err.message) || this.$t('share.errorSavingSettingsDetail'));
                });
        },
        focusShare() {
            if (!this.list.externalId) {
                // Only auto-promote on the very first share ever (no externalId yet).
                // Once a list has been shared, reopening the popover must not override
                // a visibility the user deliberately set back to private.
                this.ensureShareable();
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
                    .then(() => this.ensurePublished())
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
                .then(() => this.ensurePublished())
                .then(() => {
                    this.shareReady = true;
                    this.selectShareUrl();
                })
                .catch((err) => {
                    if (err && err.message) return;
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
            return this.$store.dispatch('saveNow');
        },
        refreshPublishStatus() {
            if (!this.isSignedIn || !this.isShared || !this.list.externalId) {
                this.publishStatus = { latestVersion: 0, publishedAt: null, hasUnpublishedChanges: false };
                return Promise.resolve();
            }
            return fetchJson(`/api/lists/${this.list.externalId}/publish-status`, { credentials: 'same-origin' })
                .then((status) => {
                    this.publishStatus = status;
                })
                .catch(() => {});
        },
        scheduleStatusRefresh() {
            clearTimeout(this.statusTimer);
            this.statusTimer = setTimeout(() => this.refreshPublishStatus(), 800);
        },
        // Button handler: save the latest edits first, then publish.
        publish() {
            if (this.publishing || !this.list.externalId) return Promise.resolve();
            this.publishing = true;
            return this.saveShareState()
                .then(() => this.publishSnapshot())
                .catch((err) => {
                    showGlobalAlert((err && err.message) || this.$t('share.errorSavingSettingsDetail'));
                })
                .finally(() => {
                    this.publishing = false;
                });
        },
        // Publish what the server already has. Callers must have saved first (focusShare and
        // setVisibility do), so the auto-publish path adds no extra save round trip.
        publishSnapshot({ silent = false } = {}) {
            return fetchJson(`/api/lists/${this.list.externalId}/publish`, {
                method: 'POST',
                credentials: 'same-origin',
                body: JSON.stringify({ note: this.publishNote }),
            })
                .then((result) => {
                    this.publishNote = '';
                    if (!silent) {
                        showGlobalAlert(result.created
                            ? this.$t('share.publishSuccess', { version: result.version })
                            : this.$t('share.publishNoChanges'));
                    }
                    return this.refreshPublishStatus();
                })
                .catch((err) => {
                    if (!silent) showGlobalAlert((err && err.message) || this.$t('share.errorPublishing'));
                });
        },
        // Auto-publish v1 the first time a list becomes shared. This is implicit
        // bookkeeping, not a user-initiated action, so it stays silent.
        ensurePublished() {
            return this.refreshPublishStatus().then(() => {
                if (this.isShared && this.list.externalId && !this.publishStatus.latestVersion) {
                    this.publishing = true;
                    return this.publishSnapshot({ silent: true }).finally(() => {
                        this.publishing = false;
                    });
                }
                return undefined;
            });
        },
    },
};
</script>
