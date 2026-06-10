<style lang="scss">
@import "../css/_globals";

.lpPublicList {
    margin: 0 auto;
    max-width: 1000px;
    padding: 32px 20px;
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

.lpPublicErrorBack {
    color: $color-accent;
    font-size: 13px;
    text-decoration: none;

    &:hover { text-decoration: underline; }
}

.lpPublicNav {
    margin-bottom: 20px;

    a {
        color: $color-text-muted;
        font-size: 13px;
        text-decoration: none;

        &:hover { color: $color-text; }
    }
}

.lpPublicListTitle {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 4px;
}

.lpPublicListSummary {
    color: $color-text-muted;
    font-size: 14px;
    margin: 0 0 24px;
}

.lpPublicChart {
    align-items: flex-start;
    display: flex;
    gap: 24px;
    margin-bottom: 32px;
}

.lpPublicChartCanvas {
    flex-shrink: 0;
    height: 200px;
    width: 200px;
}

.lpPublicChartTable {
    border-collapse: collapse;
    flex: 1;
    font-size: 13px;

    th {
        border-bottom: 1px solid $color-border;
        color: $color-text-muted;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 8px;
        text-align: right;
        text-transform: uppercase;

        &:first-child { text-align: left; }
    }

    td {
        border-bottom: 1px solid $color-border;
        padding: 6px 8px;
        text-align: right;

        &:first-child { text-align: left; }
    }

    tr:last-child td {
        border-bottom: none;
        font-weight: 700;
    }

    tr:hover td {
        background: $color-surface;
    }
}

.lpPublicChartSwatch {
    border-radius: 2px;
    display: inline-block;
    height: 10px;
    margin-right: 6px;
    vertical-align: middle;
    width: 10px;
}

.lpPublicListCategories {
    display: grid;
    gap: 16px;
}

.lpPublicListCategory h2 {
    border-bottom: 1px solid $color-border;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.05em;
    margin: 0 0 8px;
    padding-bottom: 6px;
    text-transform: uppercase;
}

.lpPublicListItem {
    align-items: center;
    border-bottom: 1px solid $color-border;
    display: grid;
    gap: 8px;
    grid-template-columns: 36px 1fr auto auto;
    padding: 4px 0;

    &:last-child { border-bottom: none; }

    &.lpPublicListItemWithPrice {
        grid-template-columns: 36px 1fr auto auto auto;
    }
}

.lpPublicListItemImage {
    border-radius: $radius-sm;
    height: 36px;
    object-fit: cover;
    width: 36px;
}

.lpPublicListItemImagePlaceholder {
    flex-shrink: 0;
    height: 36px;
    width: 36px;
}

.lpPublicListItemBody { min-width: 0; }

.lpPublicListItemName {
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 2px;
}

.lpPublicListItemMeta {
    color: $color-text-muted;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.lpPublicListItemWeight {
    font-size: 12px;
    font-weight: 600;
    text-align: right;
    white-space: nowrap;
}

.lpPublicListItemPrice {
    color: $color-text-muted;
    font-size: 12px;
    text-align: right;
    white-space: nowrap;
}

.lpPublicListItemLink {
    color: $color-accent;
    font-size: 12px;
    text-align: center;
    text-decoration: none;

    &:hover { text-decoration: underline; }
}

.lpPublicListActions {
    margin-bottom: 16px;
}

.lpCopyListBtn {
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-size: 13px;
    padding: 6px 16px;
    transition: opacity $transitionDurationFast;

    &:hover:not(:disabled) {
        opacity: 0.85;
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }
}

.lpCopyListSignIn {
    color: $color-accent;
    font-size: 13px;
    text-decoration: none;

    &:hover { text-decoration: underline; }
}

.lpCopyListError {
    color: $color-danger;
    font-size: 12px;
    margin-top: 6px;
}

.lpPublicDisclosure {
    background: $color-surface;
    border-left: 3px solid $color-accent;
    margin: 24px 0;
    padding: 12px 16px;
    font-size: 13px;
    color: $color-text-muted;
}
</style>

<template>
    <main class="lpPublicList">
        <meta v-if="list && !list.allowSearchIndexing" name="robots" content="noindex" />

        <p v-if="isLoading">Loading...</p>
        <div v-else-if="error" class="lpPublicError">
            <div class="lpPublicErrorIcon">×</div>
            <h2>{{ error }}</h2>
            <router-link to="/" class="lpPublicErrorBack">← Back to LighterPack+</router-link>
        </div>
        <template v-else-if="list">
            <nav class="lpPublicNav">
                <router-link v-if="backTo === '/community'" to="/community">← Back to Community</router-link>
                <router-link v-else-if="username" :to="`/u/${username}`">← {{ username }}'s profile</router-link>
                <router-link v-else to="/">← Back to LighterPack+</router-link>
            </nav>

            <h1 class="lpPublicListTitle">{{ list.name }}</h1>
            <div class="lpPublicListActions">
                <button
                    v-if="isLoggedIn && !isOwnList"
                    class="lpBtn lpCopyListBtn"
                    :disabled="copying"
                    @click="handleCopy"
                >
                    {{ copyLabel }}
                </button>
                <router-link v-else-if="!isLoggedIn" to="/signin" class="lpCopyListSignIn">
                    Sign in to copy this list
                </router-link>
                <p v-if="copyError" class="lpCopyListError">{{ copyError }}</p>
            </div>
            <p v-if="list.summary || list.description" class="lpPublicListSummary">{{ list.summary || list.description }}</p>

            <!-- Chart + tableau catégories -->
            <div v-show="chartCategories.length" class="lpPublicChart">
                <canvas ref="chartCanvas" class="lpPublicChartCanvas" width="200" height="200" />
                <table class="lpPublicChartTable">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Weight</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(cat, i) in chartCategories" :key="cat.id || cat.name">
                            <td>
                                <span class="lpPublicChartSwatch" :style="{ background: cat.color }" />
                                {{ cat.name }}
                            </td>
                            <td>{{ currencySymbol }}{{ formatPrice(cat.subtotalPrice) }}</td>
                            <td><strong>{{ displayWeight(cat.subtotalWeight) }}</strong> {{ totalUnit }}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>Total</td>
                            <td>{{ currencySymbol }}{{ formatPrice(list.totalPrice) }}</td>
                            <td><strong>{{ displayWeight(list.totalWeight) }}</strong> {{ totalUnit }}</td>
                        </tr>
                        <tr v-if="list.totalWornWeight">
                            <td>Worn</td>
                            <td></td>
                            <td><strong>{{ displayWeight(list.totalWornWeight) }}</strong> {{ totalUnit }}</td>
                        </tr>
                        <tr>
                            <td>Base Weight</td>
                            <td></td>
                            <td><strong>{{ displayWeight(list.totalBaseWeight) }}</strong> {{ totalUnit }}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <aside v-if="affiliateDisclosure" class="lpPublicDisclosure">
                {{ affiliateDisclosure }}
            </aside>

            <!-- Items par catégorie -->
            <section class="lpPublicListCategories">
                <div v-for="category in categories" :key="category.id || category.name" class="lpPublicListCategory">
                    <h2>{{ category.name }}</h2>
                    <div
                        v-for="item in category.items"
                        :key="item.id || item.name"
                        class="lpPublicListItem"
                        :class="{ 'lpPublicListItemWithPrice': publicFields.price }"
                    >
                        <img v-if="publicFields.images && item.imageUrl" class="lpPublicListItemImage" :src="item.imageUrl" :alt="item.name" />
                        <div v-else class="lpPublicListItemImagePlaceholder" />
                        <div class="lpPublicListItemBody">
                            <span class="lpPublicListItemName">{{ item.name }}</span><span v-if="item.brand || item.description" class="lpPublicListItemMeta"> · <span v-if="item.brand">{{ item.brand }}</span><span v-if="item.brand && item.description"> · </span><span v-if="item.description">{{ item.description }}</span></span>
                        </div>
                        <span v-if="publicFields.price" class="lpPublicListItemPrice">{{ item.price ? `${currencySymbol}${formatPrice(item.price)}` : '' }}</span>
                        <span class="lpPublicListItemWeight">{{ displayItemWeight(item) }} {{ totalUnit }}<span v-if="item.qty > 1" class="lpPublicListItemQty"> ×{{ item.qty }}</span></span>
                        <a v-if="publicFields.links && item.publicUrl" :href="item.publicUrl" target="_blank" rel="noopener noreferrer" class="lpPublicListItemLink" @click="trackItemClick(item)">Get it ↗</a>
                        <span v-else />
                    </div>
                </div>
            </section>
        </template>
    </main>
</template>

<script>
import { fetchJson } from '../utils/utils';
import { useTheme } from '../composables/useTheme';
import { useRouter } from 'vue-router';
import { useBackNav } from '../composables/useBackNav';
import { useCopyList } from '../composables/useCopyList';
const pies = require('../pies.js');
const weightUtils = require('../utils/weight.js');
const colorUtils = require('../utils/color.js');

export default {
    name: 'PublicList',
    setup() {
        useTheme();
        const router = useRouter();
        const { backTo, backLabel } = useBackNav();
        const { copying, error: copyError, copyList } = useCopyList(router);
        return { copying, copyError, copyList, backTo, backLabel };
    },
    data() {
        return {
            isLoading: true,
            error: null,
            username: null,
            list: null,
            totalUnit: 'oz',
            currencySymbol: '$',
            publicFields: { price: false, links: false, images: false },
            categories: [],
            affiliateDisclosure: null,
            chart: null,
            copySuccess: false,
        };
    },
    computed: {
        isLoggedIn() {
            return Boolean(this.$store.state.loggedIn);
        },
        isOwnList() {
            return this.$store.state.loggedIn === this.username;
        },
        copyLabel() {
            if (this.copying) return 'Copying…';
            if (this.copySuccess) return 'Copied!';
            return 'Copy list';
        },
        chartCategories() {
            return this.categories.map((cat, i) => {
                const color = colorUtils.rgbToString(colorUtils.getColor(i));
                return { ...cat, color };
            }).filter((cat) => cat.subtotalWeight > 0);
        },
    },
    mounted() {
        if (this.chartCategories.length) {
            this.$nextTick(this.renderChart);
        }
        this._themeObserver = new MutationObserver(() => this.renderChart());
        this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    },
    watch: {
        categories() {
            this.$nextTick(() => {
                this.$nextTick(() => {
                    this.$nextTick(this.renderChart);
                });
            });
        },
    },
    beforeUnmount() {
        if (this._themeObserver) this._themeObserver.disconnect();
        if (this.chart && typeof this.chart.destroy === 'function') {
            this.chart.destroy();
        }
    },
    created() {
        fetchJson(`/api/public/list/${this.$route.params.externalId}`)
            .then((payload) => {
                this.username = payload.username;
                this.list = payload.list;
                this.totalUnit = payload.totalUnit || 'oz';
                this.currencySymbol = payload.currencySymbol || '$';
                this.publicFields = payload.publicFields || { price: false, links: false, images: false };
                this.categories = payload.categories || [];
                this.affiliateDisclosure = payload.affiliateDisclosure;
                this.updateDocumentMeta();
                this.track('listView');
            })
            .catch((err) => {
                this.error = err && err.status === 404 ? 'List not found.' : 'Unable to load this list.';
            })
            .finally(() => {
                this.isLoading = false;
            });
    },
    methods: {
        displayWeight(value) {
            return weightUtils.MgToWeight(value || 0, this.totalUnit);
        },
        displayItemWeight(item) {
            return this.displayWeight((item.weight || 0) * (item.qty || 1));
        },
        formatPrice(value) {
            return value ? Number(value).toFixed(2).replace(/\.00$/, '') : '0';
        },
        getChartBg() {
            const style = getComputedStyle(document.documentElement);
            return style.getPropertyValue('--color-bg').trim() || 'rgb(245,245,245)';
        },
        renderChart() {
            const canvas = this.$refs.chartCanvas;
            if (!canvas || !this.chartCategories.length) return;
            const total = this.chartCategories.reduce((sum, cat) => sum + cat.subtotalWeight, 0);
            if (!total) return;

            // pies.js preprocess() attend { catName: { itemName: weightMg } }
            const rawData = {};
            this.chartCategories.forEach((cat) => {
                const catData = {};
                (cat.items || []).forEach((item) => {
                    const value = (item.weight || 0) * (item.qty || 1);
                    if (value > 0) catData[item.name || item.id] = value;
                });
                if (Object.keys(catData).length) rawData[cat.name] = catData;
            });

            // Always recreate so backgroundColor reflects the current theme
            if (this.chart && typeof this.chart.destroy === 'function') {
                this.chart.destroy();
            }
            this.chart = pies({ container: canvas, data: rawData, backgroundColor: this.getChartBg() });
        },
        track(type, itemId) {
            if (!this.list || !this.list.externalId) return Promise.resolve();
            return fetchJson('/api/public/insight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ externalId: this.list.externalId, type, itemId }),
            }).catch(() => {});
        },
        trackItemClick(item) { this.track('gearClick', item.id); },
        async handleCopy() {
            await this.copyList(this.$route.params.externalId);
            if (!this.copyError) {
                this.copySuccess = true;
                setTimeout(() => { this.copySuccess = false; }, 2000);
            }
        },
        updateDocumentMeta() {
            if (!this.list) return;
            document.title = `${this.list.name || 'Public list'} - LighterPack+`;
            let robots = document.querySelector('meta[name="robots"]');
            if (!this.list.allowSearchIndexing) {
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
    },
};
</script>
