<style lang="scss">
@import "../css/_public-profile";
</style>

<template>
    <teleport to="head">
        <link rel="alternate" hreflang="en" :href="canonicalBase + $route.path" />
        <link rel="alternate" hreflang="fr" :href="canonicalBase + $route.path" />
        <link rel="alternate" hreflang="de" :href="canonicalBase + $route.path" />
        <link rel="alternate" hreflang="es" :href="canonicalBase + $route.path" />
        <link rel="alternate" hreflang="x-default" :href="canonicalBase + $route.path" />
    </teleport>
    <main class="lpPublicProfile">
        <meta v-if="profile && !profile.allowSearchIndexing" name="robots" content="noindex" />

        <nav v-if="!error" class="lpPublicNav">
            <span class="lpPublicProfileNavLeft">
                <router-link :to="backTo">{{ $t(backLabelKey) }}</router-link>
            </span>
            <span class="lpPublicProfileNavRight">
                <router-link v-if="backTo !== '/community'" to="/community">{{ $t('public.backToCommunity') }}</router-link>
                <router-link v-if="showAppLink" :to="$store.state.loggedIn ? '/' : '/welcome'">
                    {{ $store.state.loggedIn ? $t('public.openApp') : $t('public.joinZenPak') }}
                </router-link>
            </span>
        </nav>

        <p v-if="isLoading">{{ $t('public.loading') }}</p>
        <div v-else-if="error" class="lpPublicError">
            <div class="lpPublicErrorIcon">×</div>
            <h2 v-if="error === 'Profile not found.'">{{ $t('public.profileNotFoundTitle') }}</h2>
            <p v-if="error === 'Profile not found.'" class="lpPublicErrorSub">{{ $t('public.profileNotFoundSub') }}</p>
            <h2 v-else>{{ $t('public.unableToLoadProfile') }}</h2>
            <router-link :to="$store.state.loggedIn ? '/' : '/welcome'" class="lpPublicErrorBack">
                {{ $store.state.loggedIn ? $t('public.backToZenPak') : $t('public.joinZenPak') }}
            </router-link>
        </div>
        <template v-else-if="profile">

            <!-- Hero -->
            <div class="lpPublicHero">
                <div class="lpPublicHeroInner">
                    <div class="lpPublicAvatar">
                        <img v-if="profile.avatarUrl" :src="profile.avatarUrl" :alt="profile.displayName" />
                        <span v-else :style="{ background: avatarBgColor, color: '#fff' }">{{ avatarLetter }}</span>
                    </div>
                    <div class="lpPublicHeroMeta">
                        <div class="lpPublicNameRow">
                            <h1 class="lpPublicName">{{ profile.displayName }}</h1>
                            <span v-if="isCreator" class="lpPublicBadge">{{ tierLabel('guide') }}</span>
                            <span v-else-if="isSupporter" class="lpPublicBadge">{{ tierLabel('trail') }}</span>
                        </div>
                        <p v-if="profile.bio" class="lpPublicBio">{{ profile.bio }}</p>
                        <div class="lpPublicStats">
                            <span><strong>{{ lists.length }}</strong> {{ $t('public.statLists') }}</span>
                            <span><strong>{{ followerCount }}</strong> {{ $t('public.statFollowers') }}</span>
                            <span><strong>{{ followingCount }}</strong> {{ $t('public.statFollowing') }}</span>
                        </div>
                        <ul v-if="safeLinks.length" class="lpPublicLinks">
                            <li v-for="link in safeLinks" :key="link.url">
                                <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.label || link.url }}</a>
                            </li>
                        </ul>
                        <div v-if="profile.gearPhilosophy && profile.gearPhilosophy.length" class="lpPublicTags">
                            <span v-for="tag in profile.gearPhilosophy" :key="tag" class="lpPublicTag">{{ tag }}</span>
                        </div>
                    </div>
                    <button
                        v-if="isLoggedIn && !isOwnProfile"
                        class="lpFollowBtn"
                        :class="{ lpFollowBtnActive: following }"
                        :disabled="followLoading"
                        @click="toggleFollow"
                    >
                        {{ following ? $t('public.following') : $t('public.follow') }}
                    </button>
                </div>
            </div>

            <!-- Listes -->
            <div v-if="lists && lists.length">
                <div class="lpPublicListsHeader">{{ $t('public.publicLists') }}</div>
                <router-link
                    v-for="list in lists"
                    :key="list.externalId"
                    :to="listTo(list.externalId)"
                    class="lpPublicListCard"
                >
                    <div class="lpPublicListName">{{ list.name }}</div>
                    <div v-if="list.description" class="lpPublicListDesc">{{ list.description }}</div>
                    <div class="lpPublicListMeta">
                        <span v-if="list.totalBaseWeight">⚖ {{ formatWeight(list.totalBaseWeight) }} base</span>
                        <span v-if="list.totalQty">📦 {{ list.totalQty }} items</span>
                    </div>
                </router-link>
            </div>
            <p v-else style="color: var(--color-text-muted); font-size: 14px;">{{ $t('public.noPublicLists') }}</p>

            <aside v-if="affiliateDisclosure || creatorCodes.length" class="lpPublicDisclosure">
                <p v-if="affiliateDisclosure">{{ affiliateDisclosure }}</p>
                <div v-if="creatorCodes.length" class="lpPublicCreatorCodes">
                    <strong>{{ $t('public.creatorCodes') }}</strong>
                    <ul>
                        <li v-for="cc in creatorCodes" :key="cc.code">
                            <a v-if="cc.url" :href="cc.url" target="_blank" rel="noopener noreferrer"><span v-if="cc.name">{{ cc.name }}: </span><strong>{{ cc.code }}</strong><span v-if="cc.label"> — {{ cc.label }}</span></a>
                            <span v-else><span v-if="cc.name">{{ cc.name }}: </span><strong>{{ cc.code }}</strong><span v-if="cc.label"> — {{ cc.label }}</span></span>
                        </li>
                    </ul>
                </div>
            </aside>

        </template>
    </main>
</template>

<script>
import { useRoute } from 'vue-router';
import { fetchJson } from '../utils/utils';
import { useFollow } from '../composables/useFollow';
import { useTheme } from '../composables/useTheme';
import { tierLabel } from '../services/tier-labels.js';
import { useBackNav } from '../composables/useBackNav';
import { avatarColor, avatarInitial } from '../utils/avatar.js';

export default {
    name: 'PublicProfile',
    setup() {
        useTheme();
        const route = useRoute();
        const { backTo, backLabelKey } = useBackNav();
        const username = route.params.username;
        const {
            following,
            mode,
            loading: followLoading,
            follow: followUser,
            unfollow: unfollowUser,
        } = useFollow(username);
        return { following, mode, followLoading, followUser, unfollowUser, backTo, backLabelKey };
    },
    data() {
        return {
            isLoading: true,
            error: null,
            profile: null,
            profileUsername: '',
            entitlements: null,
            lists: [],
            affiliateDisclosure: null,
            creatorCodes: [],
            followerCount: 0,
            followingCount: 0,
            isLoggedIn: false,
        };
    },
    computed: {
        canonicalBase() {
            return window.location.origin;
        },
        safeLinks() {
            if (!this.profile || !Array.isArray(this.profile.links)) return [];
            return this.profile.links.filter((link) => {
                if (!link || !link.url) return false;
                try {
                    const parsed = new URL(link.url);
                    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
                } catch (err) {
                    return false;
                }
            });
        },
        isSupporter() {
            return this.entitlements && (this.entitlements.plan === 'supporter' || this.entitlements.plan === 'creator');
        },
        isCreator() {
            return this.entitlements && this.entitlements.plan === 'creator';
        },
        isOwnProfile() {
            return this.$store.state.loggedIn === this.$route.params.username;
        },
        avatarBgColor() {
            return avatarColor(this.$route.params.username);
        },
        avatarLetter() {
            return avatarInitial(this.profile && this.profile.displayName, this.$route.params.username);
        },
        showAppLink() {
            const appPath = this.$store.state.loggedIn ? '/' : '/welcome';
            return this.backTo !== appPath;
        },
    },
    created() {
        const username = this.$route.params.username;
        fetchJson(`/api/public/profile/${username}`)
            .then((payload) => {
                this.profile = payload.profile;
                this.profileUsername = payload.username || username;
                this.entitlements = payload.entitlements;
                this.lists = payload.lists || [];
                this.affiliateDisclosure = payload.affiliateDisclosure;
                this.creatorCodes = payload.creatorCodes || [];
                this.followerCount = payload.followerCount || 0;
                this.followingCount = payload.followingCount || 0;
                this.updateDocumentMeta();
            })
            .catch((err) => {
                this.error = err && err.status === 404 ? 'Profile not found.' : 'Unable to load this profile.';
            })
            .finally(() => {
                this.isLoading = false;
            });

        fetchJson(`/api/community/follow-status/${username}`)
            .then((data) => {
                this.isLoggedIn = true;
                this.following = data.following;
            })
            .catch((err) => {
                if (err && !(err.isUnauthorized || err.status === 404)) {
                    this.isLoggedIn = true;
                    this.following = false;
                }
            });
    },
    methods: {
        tierLabel,
        updateDocumentMeta() {
            if (!this.profile) return;
            document.title = `${this.profile.displayName || 'Public profile'} - ZenPak`;
            let robots = document.querySelector('meta[name="robots"]');
            if (!this.profile.allowSearchIndexing) {
                if (!robots) {
                    robots = document.createElement('meta');
                    robots.setAttribute('name', 'robots');
                    document.head.appendChild(robots);
                }
                robots.setAttribute('content', 'noindex');
            } else if (robots) {
                robots.remove();
            }
        },
        formatWeight(grams) {
            if (!grams) return '';
            const kg = grams / 1000;
            return kg >= 1 ? `${kg.toFixed(1)} kg` : `${grams} g`;
        },
        listTo(externalId) {
            const profileUsername = this.profileUsername || this.$route.params.username;
            return this.$route.query.from === 'community'
                ? { path: `/p/${externalId}`, query: { from: 'community', profile: profileUsername } }
                : `/p/${externalId}`;
        },
        async toggleFollow() {
            if (!this.isLoggedIn) return;
            if (this.following) {
                await this.unfollowUser();
                this.followerCount = Math.max(0, this.followerCount - 1);
            } else {
                const currentMode = this.mode || 'all';
                await this.followUser(currentMode);
                this.followerCount += 1;
            }
        },
    },
};
</script>
