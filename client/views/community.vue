<style lang="scss">
@import "../css/_community";
</style>

<template>
    <main class="lpCommunity">
        <nav class="lpCommunityNav">
            <router-link to="/">
                {{ $t('public.backToZenPak') }}
            </router-link>
        </nav>

        <div class="lpCommunityHeader">
            <h1>{{ $t('dash.community') }}</h1>
        </div>

        <div class="lpCommunityTabs">
            <button
                class="lpCommunityTab"
                :class="{ active: activeTab === 'discover' }"
                @click="setTab('discover')"
            >
                {{ $t('community.tabDiscover') }}
            </button>
            <button
                class="lpCommunityTab"
                :class="{ active: activeTab === 'feed' }"
                :aria-disabled="!canSeeFeed || undefined"
                :title="!canSeeFeed ? 'Follow someone to see their activity' : ''"
                data-tab="feed"
                @click="canSeeFeed && setTab('feed')"
            >
                {{ $t('community.tabFeed') }}
            </button>
            <button
                class="lpCommunityTab"
                :class="{ active: activeTab === 'people' }"
                @click="setTab('people')"
            >
                {{ $t('community.tabPeople') }}
            </button>
            <button
                v-if="isModerator"
                class="lpCommunityTab"
                :class="{ active: activeTab === 'moderation' }"
                @click="setTab('moderation')"
            >
                {{ $t('community.tabModeration') }}
            </button>
        </div>

        <!-- Discover tab -->
        <div v-if="activeTab === 'discover'">
            <div class="lpCommunitySort">
                <button
                    class="lpCommunitySortBtn"
                    :class="{ active: discoverSort === 'recent' }"
                    data-sort="recent"
                    @click="changeDiscoverSort('recent')"
                >
                    {{ $t('community.sortRecent') }}
                </button>
                <button
                    class="lpCommunitySortBtn"
                    :class="{ active: discoverSort === 'popular' }"
                    data-sort="popular"
                    @click="changeDiscoverSort('popular')"
                >
                    {{ $t('community.sortPopular') }}
                </button>
            </div>

            <div class="lpCommunitySearch lpCommunityDiscoverSearch">
                <input
                    v-model="searchQuery"
                    type="search"
                    class="lpCommunitySearchInput"
                    :aria-label="$t('community.searchListsPlaceholder')"
                    :placeholder="$t('community.searchListsPlaceholder')"
                    @input="onSearchInput"
                >
                <button
                    ref="discoverFiltersToggle"
                    type="button"
                    class="lpCommunityFilterToggle"
                    :aria-expanded="showDiscoverFilters"
                    aria-controls="discover-filters"
                    @click="showDiscoverFilters = !showDiscoverFilters"
                >
                    {{ $t('community.filters') }}
                    <span v-if="activeFilterCount" class="lpCommunityFilterCount">{{ activeFilterCount }}</span>
                    <icon :name="showDiscoverFilters ? 'chevron-up' : 'chevron-down'" :size="14" />
                </button>
            </div>

            <div v-show="showDiscoverFilters" id="discover-filters" class="lpCommunityFilters">
                <input
                    v-model="filterDestination"
                    type="text"
                    :maxlength="limits.destination"
                    class="lpCommunityFilterInput"
                    :aria-label="$t('list.destination')"
                    :placeholder="$t('list.destination')"
                    @input="onFilterInput"
                >
                <lp-select
                    :value="filterSeason"
                    :options="seasonOptions"
                    :aria-label="$t('community.ariaFilterSeason')"
                    @change="val => { filterSeason = val; applyDiscoverFilters(); }"
                />
                <lp-select
                    :value="filterDuration"
                    :options="durationOptions"
                    :aria-label="$t('community.ariaFilterDuration')"
                    @change="val => { filterDuration = val; applyDiscoverFilters(); }"
                />
                <lp-select
                    :value="filterType"
                    :options="listTypeOptions"
                    :aria-label="$t('community.ariaFilterType')"
                    @change="val => { filterType = val; applyDiscoverFilters(); }"
                />
                <input
                    v-model="filterMinWeight"
                    type="number"
                    min="0"
                    step="0.1"
                    class="lpCommunityFilterInput"
                    :placeholder="$t('community.filterMinKgPlaceholder')"
                    :aria-label="$t('community.ariaMinWeight')"
                    :title="$t('community.ariaMinWeight')"
                    @input="onFilterInput"
                >
                <input
                    v-model="filterMaxWeight"
                    type="number"
                    min="0"
                    step="0.1"
                    class="lpCommunityFilterInput"
                    :placeholder="$t('community.filterMaxKgPlaceholder')"
                    :aria-label="$t('community.ariaMaxWeight')"
                    :title="$t('community.ariaMaxWeight')"
                    @input="onFilterInput"
                >
                <button v-if="activeFilterCount" type="button" class="lpCommunityFilterReset" @click="resetDiscoverFilters">
                    {{ $t('community.filterReset') }}
                </button>
            </div>

            <p v-if="discoverLoading && discoverLists.length === 0" class="lpCommunityEmpty">
                {{ $t('community.loading') }}
            </p>
            <p v-else-if="discoverError" class="lpCommunityEmpty">
                {{ $t('community.discoverLoadError') }}
            </p>
            <p v-else-if="discoverLists.length === 0" class="lpCommunityEmpty">
                {{ $t(activeFilterCount || searchQuery.trim() ? 'community.emptyDiscoverFiltered' : 'community.emptyDiscoverNone') }}
            </p>
            <template v-else>
                <div class="lpCommunityDiscoverLayout">
                    <section class="lpCommunityResults">
                        <div v-for="group in discoverGroups" :key="group.featured" :class="{ lpCommunityFeatured: group.featured }">
                            <div v-if="group.featured" class="lpCommunityFeaturedLabel">
                                {{ $t('community.featuredLabel') }}
                            </div>
                            <div
                                v-for="list in group.lists"
                                :key="list.externalId"
                                class="lpCommunityCard"
                                :class="{ lpCommunityCardFeatured: group.featured }"
                                style="cursor: pointer;"
                                role="link"
                                tabindex="0"
                                @click="$router.push(communityListTo(list))"
                                @keydown.enter.self="$router.push(communityListTo(list))"
                            >
                                <div class="lpCommunityCardName">
                                    {{ list.name }}
                                </div>
                                <div class="lpCommunityCardAuthor">
                                    <span class="lpInvisible">{{ $t('public.byAuthor') }}</span> <PersonAvatar :avatar-url="list.authorAvatarUrl" :display-name="list.authorDisplayName" :username="list.author" /> <router-link :to="communityProfileTo(list.author)" @click.stop>
                                        {{ listAuthorName(list) }}
                                    </router-link>
                                    <span v-if="list.authorTier === 'guide'" class="lpCommunityBadge">{{ tierLabel('guide') }}</span>
                                    <span v-else-if="list.authorTier === 'trail'" class="lpCommunityBadge">{{ tierLabel('trail') }}</span>
                                </div>
                                <div v-if="listSourceName(list)" class="lpCommunityCardSource">
                                    {{ $t('dash.source') }} <router-link :to="communityProfileTo(list.sourceOwnerUsername)" @click.stop>
                                        {{ listSourceName(list) }}
                                    </router-link>
                                </div>
                                <div class="lpCommunityCardMeta">
                                    <span v-if="list.totalBaseWeight" class="lpCommunityCardMetaItem">{{ $t('community.metaBase', { weight: formatWeight(list.totalBaseWeight) }) }}</span>
                                    <span v-if="list.totalQty" class="lpCommunityCardMetaItem">{{ $tc('community.metaItems', list.totalQty) }}</span>
                                    <span v-if="list.viewCount" class="lpCommunityCardMetaItem">{{ $tc('community.metaViews', list.viewCount) }}</span>
                                    <span v-if="list.copyCount" class="lpCommunityCardMetaItem">{{ $tc('community.metaCopies', list.copyCount) }}</span>
                                    <span v-if="list.updatedAt && new Date(list.updatedAt) > new Date('2020-01-01')" class="lpCommunityCardMetaItem">{{ timeAgo(list.updatedAt) }}</span>
                                </div>
                                <div v-if="list.destination || listTags(list).length" class="lpCommunityTags">
                                    <button
                                        v-if="list.destination"
                                        type="button"
                                        class="lpCommunityTag lpCommunityDestinationTag"
                                        :aria-label="$t('community.filterByDestination', { destination: list.destination })"
                                        @click.stop="filterByDestination(list.destination)"
                                    >
                                        <icon name="map-pin" :size="12" />
                                        {{ list.destination }}
                                    </button>
                                    <span v-for="tag in listTags(list)" :key="list.externalId + '-' + tag" class="lpCommunityTag">{{ formatTag(tag) }}</span>
                                </div>
                            </div>
                        </div>
                        <button v-if="discoverHasMore" class="lpCommunityLoadMore" :disabled="discoverLoading" @click="discoverLoadMore">
                            {{ discoverLoading ? $t('community.loading') : $t('community.feedLoadMore') }}
                        </button>
                    </section>
                    <aside class="lpCommunityPopular" :aria-label="$t('community.ariaPopularPacks')">
                        <div class="lpCommunityPopularTitle">
                            {{ $t('community.popularPacksTitle') }}
                        </div>
                        <p v-if="popularLoading" class="lpCommunityPopularEmpty">
                            {{ $t('community.loading') }}
                        </p>
                        <div
                            v-for="list in popularLists"
                            :key="'popular-' + list.externalId"
                            class="lpCommunityPopularItem"
                            role="link"
                            tabindex="0"
                            @click="$router.push(communityListTo(list))"
                            @keydown.enter="$router.push(communityListTo(list))"
                        >
                            <span class="lpCommunityPopularName">{{ list.name }}</span>
                            <router-link class="lpCommunityPopularAuthor" :to="communityProfileTo(list.author)" @click.stop>
                                {{ listAuthorName(list) }}
                            </router-link>
                            <span v-if="listSourceName(list)" class="lpCommunityPopularSource">
                                {{ $t('dash.source') }} <router-link :to="communityProfileTo(list.sourceOwnerUsername)" @click.stop>{{ listSourceName(list) }}</router-link>
                            </span>
                            <span class="lpCommunityPopularMeta">{{ popularMeta(list) }}</span>
                        </div>
                    </aside>
                </div>
            </template>
        </div>

        <!-- People tab -->
        <community-people v-if="activeTab === 'people'" />

        <!-- My Feed tab -->
        <div v-if="activeTab === 'feed'">
            <p v-if="feedLoading && feedEvents.length === 0" class="lpCommunityEmpty">
                {{ $t('community.loading') }}
            </p>
            <p v-else-if="feedError" class="lpCommunityEmpty">
                {{ $t('community.feedLoadError') }}
            </p>
            <p v-else-if="feedEvents.length === 0" class="lpCommunityEmpty">
                {{ $t('community.emptyFeedNone') }}
            </p>
            <template v-else>
                <article v-for="event in feedEvents" :key="String(event._id)" class="lpCommunityEvent">
                    <router-link :to="communityProfileTo(event.author)" class="lpCommunityEventAvatar" :aria-label="event.author">
                        <img loading="lazy" v-if="event.avatarUrl" :src="event.avatarUrl" alt="">
                        <span v-else>{{ event.author.charAt(0).toUpperCase() }}</span>
                    </router-link>
                    <div class="lpCommunityEventBody">
                        <div class="lpCommunityEventLine">
                            <router-link :to="communityProfileTo(event.author)">
                                {{ event.author }}
                            </router-link>
                            <span v-if="event.authorTier === 'guide'" class="lpCommunityBadge">{{ tierLabel('guide') }}</span>
                            <span v-else-if="event.authorTier === 'trail'" class="lpCommunityBadge">{{ tierLabel('trail') }}</span>
                            <span> {{ eventLabel(event.type) }}</span>
                        </div>
                        <router-link
                            v-if="event.listName && event.listExternalId"
                            :to="communityListTo({ externalId: event.listExternalId })"
                            class="lpCommunityEventList lpCommunityEventListLink"
                        >
                            {{ event.listName }}
                        </router-link>
                        <div v-else-if="event.listName" class="lpCommunityEventList">
                            {{ event.listName }}
                        </div>
                        <div v-else-if="event.listDeleted" class="lpCommunityEventList lpCommunityEventListDeleted">
                            {{ $t('community.listNoLongerAvailable') }}
                        </div>
                        <div class="lpCommunityEventTime">
                            {{ timeAgo(event.createdAt) }}
                        </div>
                    </div>
                </article>
                <button v-if="feedHasMore" class="lpCommunityLoadMore" :disabled="feedLoading" @click="feedLoadMore">
                    {{ feedLoading ? $t('community.loading') : $t('community.feedLoadMore') }}
                </button>
            </template>
        </div>

        <!-- Moderation tab -->
        <p v-if="moderationError" class="lpCommunityEmpty">
            {{ moderationError }}
        </p>
        <community-moderation
            v-if="activeTab === 'moderation' && isModerator"
            @feature-list="featureList"
        />
    </main>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import { DEBOUNCE_MS } from '../services/timings';
import { useDiscover } from '../composables/useDiscover';
import { useFeed } from '../composables/useFeed';
import { useTheme } from '../composables/useTheme';
import { FIELD_LIMITS } from '../services/field-limits';
import { fetchJson } from '../utils/utils';
import { tierLabel } from '../services/tier-labels';
import LpSelect from '../components/lp-select.vue';
import Icon from '../components/icon.vue';
import PersonAvatar from '../components/person-avatar.vue';
import {
    LIST_TYPE_VALUES, DURATION_VALUES, SEASON_VALUES, toI18nOptions,
} from '../data/list-type-options';

const CommunityModeration = defineAsyncComponent(() => import(/* webpackChunkName: "community-moderation" */ '../components/community-moderation.vue'));
const CommunityPeople = defineAsyncComponent(() => import(/* webpackChunkName: "community-people" */ '../components/community-people.vue'));

export default {
    name: 'CommunityView',
    components: {
        CommunityModeration, CommunityPeople, Icon, LpSelect, PersonAvatar,
    },
    setup() {
        useTheme();
        const {
            lists: discoverLists,
            loading: discoverLoading,
            error: discoverError,
            hasMore: discoverHasMore,
            sort: discoverSort,
            setSort: setDiscoverSort,
            setQuery: setDiscoverQuery,
            setFilters: setDiscoverFilters,
            load: discoverLoad,
            loadMore: discoverLoadMore,
        } = useDiscover();

        const {
            lists: popularLists,
            loading: popularLoading,
            load: popularLoad,
        } = useDiscover({ sort: 'popular', limit: 5 });

        const {
            events: feedEvents,
            loading: feedLoading,
            error: feedError,
            hasMore: feedHasMore,
            load: feedLoad,
            loadMore: feedLoadMore,
        } = useFeed();

        discoverLoad();
        popularLoad();

        return {
            discoverLists,
            discoverLoading,
            discoverError,
            discoverHasMore,
            discoverSort,
            setDiscoverSort,
            setDiscoverQuery,
            setDiscoverFilters,
            discoverLoadMore,
            popularLists,
            popularLoading,
            feedEvents,
            feedLoading,
            feedError,
            feedHasMore,
            feedLoad,
            feedLoadMore,
        };
    },
    data() {
        return {
            activeTab: this.tabFromPath(this.$route.path),
            searchQuery: '',
            searchTimeout: null,
            filterTimeout: null,
            limits: FIELD_LIMITS,
            showDiscoverFilters: false,
            filterSeason: '',
            filterType: '',
            filterDuration: '',
            filterDestination: '',
            filterMinWeight: '',
            filterMaxWeight: '',
            isModerator: false,
            moderationError: null,
        };
    },
    computed: {
        seasonOptions() {
            return [
                { value: '', label: this.$t('community.filterSeasonAny') },
                ...toI18nOptions(SEASON_VALUES, (key) => this.$t(key)),
            ];
        },
        durationOptions() {
            return [
                { value: '', label: this.$t('community.filterDurationAny') },
                ...toI18nOptions(DURATION_VALUES, (key) => this.$t(key)),
            ];
        },
        listTypeOptions() {
            return [
                { value: '', label: this.$t('community.filterTypeAny') },
                ...toI18nOptions(LIST_TYPE_VALUES, (key) => this.$t(key)),
            ];
        },
        canSeeFeed() {
            return Boolean(this.$store.state.loggedIn);
        },
        discoverGroups() {
            return [true, false].map((featured) => ({
                featured,
                lists: this.discoverLists.filter((list) => Boolean(list.featured) === featured),
            })).filter((group) => group.lists.length);
        },
        activeFilterCount() {
            return [this.filterSeason, this.filterType, this.filterDuration, this.filterDestination.trim(),
                this.filterMinWeight !== '' || this.filterMaxWeight !== ''].filter(Boolean).length;
        },
    },
    created() {
        if (this.canSeeFeed && this.activeTab === 'feed') this.feedLoad();
        if (this.canSeeFeed) this.fetchModeratorFlag();
    },
    methods: {
        tierLabel,
        tabFromPath(path) {
            if (path.endsWith('/feed')) return 'feed';
            if (path.endsWith('/people')) return 'people';
            return 'discover';
        },
        setTab(tab) {
            this.activeTab = tab;
            const path = { feed: '/community/feed', people: '/community/people' }[tab] || '/community';
            if (this.$route.path !== path) this.$router.replace(path);
            if (tab === 'feed' && this.feedEvents.length === 0) this.feedLoad();
        },
        onSearchInput() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.setDiscoverQuery(this.searchQuery);
            }, 300);
        },
        onFilterInput() {
            clearTimeout(this.filterTimeout);
            this.filterTimeout = setTimeout(this.applyDiscoverFilters, DEBOUNCE_MS);
        },
        applyDiscoverFilters() {
            this.setDiscoverFilters({
                season: this.filterSeason,
                type: this.filterType,
                duration: this.filterDuration,
                destination: this.filterDestination,
                minWeightKg: this.filterMinWeight,
                maxWeightKg: this.filterMaxWeight,
            });
        },
        filterByDestination(destination) {
            clearTimeout(this.filterTimeout);
            this.filterDestination = destination;
            this.$refs.discoverFiltersToggle.focus();
            this.applyDiscoverFilters();
        },
        resetDiscoverFilters() {
            clearTimeout(this.filterTimeout);
            this.filterSeason = '';
            this.filterType = '';
            this.filterDuration = '';
            this.filterDestination = '';
            this.filterMinWeight = '';
            this.filterMaxWeight = '';
            this.applyDiscoverFilters();
        },
        changeDiscoverSort(value) {
            this.searchQuery = '';
            this.setDiscoverSort(value);
        },
        eventLabel(type) {
            if (type === 'list.published') return this.$t('community.eventPublished');
            if (type === 'list.made-public') return this.$t('community.eventMadePublic');
            if (type === 'list.updated') return this.$t('community.eventUpdated');
            return this.$t('community.eventGearUpdated');
        },
        communityListTo(list) {
            return { path: `/p/${list.externalId}`, query: { from: 'community' } };
        },
        communityProfileTo(username) {
            return { path: `/u/${username}`, query: { from: 'community' } };
        },
        listAuthorName(list) {
            return list.authorDisplayName || list.author;
        },
        listSourceName(list) {
            if (!list.sourceOwnerUsername || list.sourceOwnerUsername === list.author) return '';
            return list.sourceOwnerName || list.sourceOwnerUsername;
        },
        popularMeta(list) {
            return [
                this.$tc('community.metaViews', list.viewCount || 0),
                list.totalBaseWeight ? this.$t('community.metaBase', { weight: this.formatWeight(list.totalBaseWeight) }) : '',
            ].filter(Boolean).join(' · ');
        },
        formatWeight(mg) {
            if (!mg) return '';
            const kg = mg / 1000000;
            return kg >= 1 ? `${kg.toFixed(1)} kg` : `${Math.round(mg / 1000)} g`;
        },
        listTags(list) {
            return [
                ...(Array.isArray(list.seasons) ? list.seasons : []),
                ...(Array.isArray(list.durations) ? list.durations : []),
                ...(Array.isArray(list.listTypes) ? list.listTypes : []),
            ];
        },
        formatTag(value) {
            const label = [...this.seasonOptions, ...this.durationOptions, ...this.listTypeOptions].find((option) => option.value === value);
            return label ? label.label : value;
        },
        timeAgo(dateStr) {
            const diff = Date.now() - new Date(dateStr).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return this.$t('misc.timeJustNow');
            if (mins < 60) return this.$t('misc.timeMinutesAgo', { count: mins });
            const hours = Math.floor(mins / 60);
            if (hours < 24) return this.$t('misc.timeHoursAgo', { count: hours });
            const days = Math.floor(hours / 24);
            if (days < 7) return this.$t('misc.timeDaysAgo', { count: days });
            return new Date(dateStr).toLocaleDateString();
        },
        async featureList(externalId) {
            this.moderationError = null;
            try {
                const data = await fetchJson(`/api/reports/feature/${externalId}`, { method: 'POST' });
                const list = this.discoverLists.find((l) => l.externalId === externalId);
                if (list) list.featured = data.featured;
            } catch {
                this.moderationError = 'Unable to update featured list.';
            }
        },
        async fetchModeratorFlag() {
            try {
                const data = await fetchJson('/api/auth/me');
                this.isModerator = Boolean(data.isModerator);
            } catch {
                this.isModerator = false;
            }
        },
    },
};
</script>
