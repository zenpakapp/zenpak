<style lang="scss">
@import "../css/_globals";

.lpPublicProfile {
    background: $color-bg;
    margin: 0 auto;
    max-width: 680px;
    padding: 20px 20px 40px;
}

.lpPublicError {
    margin: 80px auto;
    max-width: 400px;
    text-align: center;

    h2 {
        color: $color-text;
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 16px;
    }
}

.lpPublicErrorIcon {
    color: $color-text-muted;
    font-size: 48px;
    font-weight: 300;
    line-height: 1;
    margin-bottom: 16px;
}

.lpPublicErrorSub {
    color: $color-text-muted;
    font-size: 14px;
    margin: -8px 0 16px;
}

.lpPublicErrorBack {
    color: $color-accent;
    font-size: 13px;
    text-decoration: none;

    &:hover { text-decoration: underline; }
}

.lpPublicNav {
    margin-bottom: 16px;

    a {
        color: $color-text-muted;
        font-size: 13px;
        text-decoration: none;

        &:hover {
            color: $color-text;
        }
    }
}

.lpPublicHero {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    margin-bottom: 12px;
    padding: 20px;
}

.lpPublicHeroInner {
    align-items: flex-start;
    display: flex;
    gap: 14px;
}

.lpPublicAvatar {
    align-items: center;
    background: linear-gradient(135deg, $color-accent, rgba(var(--color-accent-rgb), 0.5));
    border-radius: 50%;
    color: #fff;
    display: flex;
    flex-shrink: 0;
    font-size: 22px;
    font-weight: 700;
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

.lpPublicHeroMeta {
    flex: 1;
    min-width: 0;
}

.lpPublicNameRow {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 4px;
}

.lpPublicName {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
}

.lpPublicBadge {
    background: $color-accent;
    border-radius: 10px;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 2px 8px;
    text-transform: uppercase;
}

.lpPublicBio {
    color: $color-text-muted;
    font-size: 13px;
    line-height: 1.5;
    margin: 0 0 10px;
}

.lpPublicStats {
    display: flex;
    font-size: 12px;
    gap: 16px;
    color: $color-text-muted;

    strong {
        color: $color-text;
        font-weight: 600;
    }
}

.lpPublicLinks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    list-style: none;
    margin: 12px 0 0;
    padding: 0;

    a {
        color: $color-accent;
        font-size: 12px;
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }
}

.lpPublicTags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
}

.lpPublicTag {
    background: $color-bg;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text-muted;
    font-size: 11px;
    padding: 3px 8px;
}

.lpPublicListsHeader {
    color: $color-text-muted;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
    text-transform: uppercase;
}

.lpPublicListCard {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    cursor: pointer;
    display: block;
    margin-bottom: 8px;
    padding: 14px 16px;
    text-decoration: none;
    transition: border-color $transitionDurationFast ease;

    &:hover {
        border-color: $color-accent;
    }

    &:last-child {
        margin-bottom: 0;
    }
}

.lpPublicListName {
    color: $color-accent;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 5px;
}

.lpPublicListDesc {
    color: $color-text-muted;
    font-size: 12px;
    line-height: 1.5;
    margin-bottom: 8px;
}

.lpPublicListMeta {
    color: $color-text-muted;
    display: flex;
    font-size: 11px;
    gap: 14px;
}

.lpPublicDisclosure {
    background: $color-surface;
    border-left: 3px solid $color-accent;
    border-radius: 0 $radius-sm $radius-sm 0;
    color: $color-text-muted;
    font-size: 12px;
    margin-top: 16px;
    padding: 10px 14px;
}
</style>

<template>
    <main class="lpPublicProfile">
        <meta v-if="profile && !profile.allowSearchIndexing" name="robots" content="noindex" />

        <nav v-if="!error" class="lpPublicNav">
            <router-link :to="backTo">{{ backLabel }}</router-link>
        </nav>

        <p v-if="isLoading">Loading...</p>
        <div v-else-if="error" class="lpPublicError">
            <div class="lpPublicErrorIcon">×</div>
            <h2 v-if="error === 'Profile not found.'">This trail goes nowhere.</h2>
            <p v-if="error === 'Profile not found.'" class="lpPublicErrorSub">The profile you're looking for doesn't exist.</p>
            <h2 v-else>{{ error }}</h2>
            <router-link to="/" class="lpPublicErrorBack">← Back to ZenPak</router-link>
        </div>
        <template v-else-if="profile">

            <!-- Hero -->
            <div class="lpPublicHero">
                <div class="lpPublicHeroInner">
                    <div class="lpPublicAvatar">
                        <img v-if="profile.avatarUrl" :src="profile.avatarUrl" :alt="profile.displayName" />
                        <upgrade-prompt v-else-if="isOwnProfile && !isTrail" tier="trail" feature="profileCustomization" mode="inline" />
                        <span v-else>{{ (profile.displayName || '?').charAt(0).toUpperCase() }}</span>
                    </div>
                    <div class="lpPublicHeroMeta">
                        <div class="lpPublicNameRow">
                            <h1 class="lpPublicName">{{ profile.displayName }}</h1>
                            <span v-if="isCreator" class="lpPublicBadge">Guide</span>
                            <span v-else-if="isSupporter" class="lpPublicBadge">Trail</span>
                        </div>
                        <upgrade-prompt v-if="isOwnProfile && !isTrail && !profile.bio" tier="trail" feature="profileCustomization" mode="inline" />
                        <p v-else-if="profile.bio" class="lpPublicBio">{{ profile.bio }}</p>
                        <div class="lpPublicStats">
                            <span><strong>{{ lists.length }}</strong> lists</span>
                            <span><strong>{{ followerCount }}</strong> followers</span>
                            <span><strong>{{ followingCount }}</strong> following</span>
                        </div>
                        <upgrade-prompt v-if="isOwnProfile && !isTrail && !safeLinks.length" tier="trail" feature="profileCustomization" mode="inline" />
                        <ul v-else-if="safeLinks.length" class="lpPublicLinks">
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
                        {{ following ? 'Following' : 'Follow' }}
                    </button>
                </div>
            </div>

            <!-- Listes -->
            <div v-if="lists && lists.length">
                <div class="lpPublicListsHeader">Public lists</div>
                <router-link
                    v-for="list in lists"
                    :key="list.externalId"
                    :to="`/p/${list.externalId}`"
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
            <p v-else style="color: var(--color-text-muted); font-size: 14px;">No public lists yet.</p>

            <aside v-if="affiliateDisclosure" class="lpPublicDisclosure">
                {{ affiliateDisclosure }}
            </aside>

        </template>
    </main>
</template>

<script>
import { useRoute } from 'vue-router';
import { fetchJson } from '../utils/utils';
import { useFollow } from '../composables/useFollow';
import { useTheme } from '../composables/useTheme';
import { useBackNav } from '../composables/useBackNav';
import upgradePrompt from '../components/upgrade-prompt.vue';
import { hasFeature, FEATURES } from '../services/entitlements.js';

export default {
    name: 'PublicProfile',
    components: { upgradePrompt },
    setup() {
        useTheme();
        const route = useRoute();
        const { backTo, backLabel } = useBackNav();
        const username = route.params.username;
        const {
            following,
            mode,
            loading: followLoading,
            follow: followUser,
            unfollow: unfollowUser,
        } = useFollow(username);
        return { following, mode, followLoading, followUser, unfollowUser, backTo, backLabel };
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
        isTrail() {
            const lib = this.$store.state.library;
            return lib && lib.entitlements && hasFeature(lib.entitlements, FEATURES.PROFILE_CUSTOMIZATION);
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
                if (err && !(err.isUnauthorized || err.status === 404)) {
                    this.isLoggedIn = true;
                    this.following = false;
                }
            });
    },
    methods: {
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
