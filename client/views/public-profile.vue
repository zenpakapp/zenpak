<style lang="scss">
@import "../css/_globals";

.lpPublicProfile {
    margin: 0 auto;
    max-width: 900px;
    padding: 32px 20px;
}

.lpPublicProfileHeader {
    display: flex;
    gap: 20px;
}

.lpPublicProfileAvatar {
    border-radius: 50%;
    height: 96px;
    object-fit: cover;
    width: 96px;
}

.lpPublicBadges,
.lpPublicLinks,
.lpPublicTags,
.lpPublicLists {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.lpPublicBadge,
.lpPublicTag {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    padding: 4px 8px;
}

.lpPublicDisclosure {
    background: $color-surface;
    border-left: 3px solid $color-accent;
    margin: 24px 0;
    padding: 12px 16px;
}
</style>

<template>
    <main class="lpPublicProfile">
        <meta v-if="profile && !profile.allowSearchIndexing" name="robots" content="noindex" />

        <p v-if="isLoading">Loading...</p>
        <p v-else-if="error">{{ error }}</p>
        <template v-else-if="profile">
            <header class="lpPublicProfileHeader">
                <img v-if="profile.avatarUrl" class="lpPublicProfileAvatar" :src="profile.avatarUrl" :alt="profile.displayName" />
                <div>
                    <h1>{{ profile.displayName }}</h1>
                    <p v-if="profile.trailName">{{ profile.trailName }}</p>
                    <p v-if="profile.bio">{{ profile.bio }}</p>
                    <p v-if="profile.location">{{ profile.location }}</p>
                    <div class="lpPublicBadges">
                        <span v-if="isSupporter" class="lpPublicBadge">Supporter</span>
                        <span v-if="isCreator" class="lpPublicBadge">Creator</span>
                    </div>
                    <div class="lpPublicStats">
                        <span><strong>{{ followerCount }}</strong> followers</span>
                        <span><strong>{{ followingCount }}</strong> following</span>
                    </div>
                    <button
                        v-if="isLoggedIn"
                        class="lpFollowBtn"
                        :class="{ lpFollowBtnActive: following }"
                        :disabled="followLoading"
                        @click="toggleFollow"
                    >
                        {{ following ? 'Following' : 'Follow' }}
                    </button>
                </div>
            </header>

            <section v-if="profile.links && profile.links.length">
                <h2>Links</h2>
                <ul class="lpPublicLinks">
                    <li v-for="link in safeLinks" :key="link.url || link.label">
                        <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.label || link.url }}</a>
                    </li>
                </ul>
            </section>

            <section v-if="profile.gearPhilosophy && profile.gearPhilosophy.length">
                <h2>Gear philosophy</h2>
                <div class="lpPublicTags">
                    <span v-for="tag in profile.gearPhilosophy" :key="tag" class="lpPublicTag">{{ tag }}</span>
                </div>
            </section>

            <aside v-if="affiliateDisclosure" class="lpPublicDisclosure">
                {{ affiliateDisclosure }}
            </aside>

            <section>
                <h2>Public lists</h2>
                <ul v-if="lists && lists.length" class="lpPublicLists">
                    <li v-for="list in lists" :key="list.externalId">
                        <router-link :to="`/p/${list.externalId}`">{{ list.name }}</router-link>
                    </li>
                </ul>
                <p v-else>No public lists yet.</p>
            </section>
        </template>
    </main>
</template>

<script>
import { useRoute } from 'vue-router';
import { fetchJson } from '../utils/utils';
import { useFollow } from '../composables/useFollow';

export default {
    name: 'PublicProfile',
    setup() {
        const route = useRoute();
        const username = route.params.username;
        const {
            following,
            mode,
            loading: followLoading,
            follow: followUser,
            unfollow: unfollowUser,
        } = useFollow(username);
        return { following, mode, followLoading, followUser, unfollowUser };
    },
    data() {
        return {
            isLoading: true,
            error: null,
            profile: null,
            entitlements: null,
            lists: [],
            affiliateDisclosure: null,
            followerCount: 0,
            followingCount: 0,
            isLoggedIn: false,
        };
    },
    computed: {
        safeLinks() {
            if (!this.profile || !Array.isArray(this.profile.links)) {
                return [];
            }
            return this.profile.links.filter((link) => {
                if (!link || !link.url) {
                    return false;
                }
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
    },
    created() {
        const username = this.$route.params.username;
        fetchJson(`/api/public/profile/${username}`)
            .then((payload) => {
                this.profile = payload.profile;
                this.entitlements = payload.entitlements;
                this.lists = payload.lists || [];
                this.affiliateDisclosure = payload.affiliateDisclosure;
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
                // 401/403/404 = not logged in (404 = stale cookie via authenticateUser).
                // Anything else = authenticated but server error — show button in safe state.
                if (err && !(err.isUnauthorized || err.status === 404)) {
                    this.isLoggedIn = true;
                    this.following = false;
                }
            });
    },
    methods: {
        updateDocumentMeta() {
            if (!this.profile) {
                return;
            }
            document.title = `${this.profile.displayName || 'Public profile'} - LighterPack+`;
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
