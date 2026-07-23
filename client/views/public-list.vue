<style lang="scss">
@import "../css/_public-list";
</style>

<template>
    <teleport to="head">
        <link rel="alternate" hreflang="en" :href="canonicalBase + $route.path" />
        <link rel="alternate" hreflang="fr" :href="canonicalBase + $route.path" />
        <link rel="alternate" hreflang="de" :href="canonicalBase + $route.path" />
        <link rel="alternate" hreflang="es" :href="canonicalBase + $route.path" />
        <link rel="alternate" hreflang="x-default" :href="canonicalBase + $route.path" />
    </teleport>
    <main class="lpPublicList">
        <meta v-if="list && !list.allowSearchIndexing" name="robots" content="noindex" />

        <p v-if="isLoading">{{ $t('public.loading') }}</p>
        <div v-else-if="error" class="lpPublicError">
            <div class="lpPublicErrorIcon">×</div>
            <h2>{{ error }}</h2>
            <router-link :to="$store.state.loggedIn ? '/' : '/welcome'" class="lpPublicErrorBack">
                {{ $store.state.loggedIn ? $t('public.backToZenPak') : $t('public.joinZenPak') }}
            </router-link>
        </div>
        <template v-else-if="list">
            <nav class="lpPublicNav">
                <router-link v-if="backTo === '/community'" to="/community">{{ $t('public.backToCommunity') }}</router-link>
                <span v-else-if="username" class="lpPublicNavAuthor">
                    <router-link :to="`/u/${username}`">{{ $t('public.backToProfile', { username }) }}</router-link>
                    <span v-if="authorTier === 'creator'" class="lpPublicListBadge">Wayfarer</span>
                    <span v-else-if="authorTier === 'supporter'" class="lpPublicListBadge">Kin</span>
                </span>
                <router-link v-else :to="$store.state.loggedIn ? '/' : '/welcome'">{{ $store.state.loggedIn ? $t('public.backToZenPak') : $t('public.joinZenPak') }}</router-link>
            </nav>

            <h1 class="lpPublicListTitle">{{ list.name }}</h1>
            <div class="lpPublicListActions">
                <button
                    v-if="isLoggedIn && !isOwnList && isCopyable"
                    class="lpBtn lpCopyListBtn"
                    :disabled="copying"
                    @click="handleCopy"
                >
                    {{ copyLabel }}
                </button>
                <router-link v-else-if="!isLoggedIn && isCopyable" :to="`/welcome?redirect=/p/${list.externalId}`" class="lpCopyListSignIn">
                    {{ $t('public.signInToCopy') }}
                </router-link>
                <p v-if="copyError" class="lpCopyListError">{{ copyError }}</p>
                <button v-if="isOwnList" class="lpBtn lpPrintBtn noprint" @click="printList">{{ $t('public.printSaveAsPdf') }}</button>
            </div>
            <p v-if="list.summary || list.description" class="lpPublicListSummary">{{ list.summary || list.description }}</p>

            <!-- Chart + tableau catégories -->
            <div v-show="chartCategories.length" class="lpPublicChart">
                <canvas ref="chartCanvas" class="lpPublicChartCanvas" width="200" height="200" />
                <table class="lpPublicChartTable">
                    <thead>
                        <tr>
                            <th>{{ $t('public.category') }}</th>
                            <th>{{ $t('public.price') }}</th>
                            <th>{{ $t('public.weight') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(cat, i) in chartCategories" :key="cat.id || cat.name" :class="{ lpPublicChartRowActive: hoveredCategoryIdx === i }">
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
                            <td>{{ $t('public.total') }}</td>
                            <td>{{ currencySymbol }}{{ formatPrice(list.totalPrice) }}</td>
                            <td><strong>{{ displayWeight(list.totalWeight) }}</strong> {{ totalUnit }}</td>
                        </tr>
                        <tr v-if="list.totalWornWeight">
                            <td>{{ $t('public.worn') }}</td>
                            <td></td>
                            <td><strong>{{ displayWeight(list.totalWornWeight) }}</strong> {{ totalUnit }}</td>
                        </tr>
                        <tr>
                            <td>{{ $t('public.baseWeight') }}</td>
                            <td></td>
                            <td><strong>{{ displayWeight(list.totalBaseWeight) }}</strong> {{ totalUnit }}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

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
                            <div><span class="lpPublicListItemName">{{ item.name }}</span><span v-if="item.brand || item.description" class="lpPublicListItemMeta"> · <span v-if="item.brand">{{ item.brand }}</span><span v-if="item.brand && item.description"> · </span><span v-if="item.description">{{ item.description }}</span></span></div>
                            <div v-if="item.promoCode" class="lpPublicListItemPromo">
                                <span v-if="item.promoLabel" class="lpPublicListItemPromoLabel">{{ item.promoLabel }}</span>
                                <span class="lpPublicListItemPromoCode">{{ item.promoCode }}</span>
                            </div>
                        </div>
                        <span v-if="publicFields.price" class="lpPublicListItemPrice">{{ item.price ? `${currencySymbol}${formatPrice(item.price)}` : '' }}</span>
                        <span class="lpPublicListItemWeight">{{ displayItemWeight(item) }} {{ totalUnit }}<span v-if="item.qty > 1" class="lpPublicListItemQty"> ×{{ item.qty }}</span></span>
                        <a v-if="publicFields.links && item.publicUrl" :href="item.publicUrl" target="_blank" rel="noopener noreferrer" class="lpPublicListItemLink" @click="trackItemClick(item)">{{ $t('public.getItArrow') }}</a>
                        <span v-else />
                    </div>
                </div>
            </section>
        </template>
        <footer class="lpPublicMadeWith">
            <router-link :to="$store.state.loggedIn ? '/' : '/welcome'">Made with ❤️ ZenPak</router-link>
        </footer>
    </main>
</template>

<script>
import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';
import { fetchJson } from '../utils/utils';
import { useTheme } from '../composables/useTheme';
import { useRouter } from 'vue-router';
import { useBackNav } from '../composables/useBackNav';
import { useCopyList } from '../composables/useCopyList';
const weightUtils = require('../utils/weight.js');
const colorUtils = require('../utils/color.js');

Chart.register(DoughnutController, ArcElement, Tooltip);

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
            creatorCodes: [],
            authorTier: null,
            chart: null,
            copySuccess: false,
            hoveredCategoryIdx: null,
        };
    },
    computed: {
        canonicalBase() {
            return window.location.origin;
        },
        isLoggedIn() {
            return Boolean(this.$store.state.loggedIn);
        },
        isOwnList() {
            return this.$store.state.loggedIn === this.username;
        },
        isCopyable() {
            return this.list?.visibility === 'discoverable' || this.list?.visibility === 'indexable';
        },
        copyLabel() {
            if (this.copying) return this.$t('public.copying');
            if (this.copySuccess) return this.$t('public.copied');
            return this.$t('public.copyList');
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
                this.authorTier = payload.authorTier || null;
                this.list = payload.list;
                this.totalUnit = payload.totalUnit || 'oz';
                this.currencySymbol = payload.currencySymbol || '$';
                this.publicFields = payload.publicFields || { price: false, links: false, images: false };
                this.categories = payload.categories || [];
                this.affiliateDisclosure = payload.affiliateDisclosure;
                this.creatorCodes = payload.creatorCodes || [];
                this.updateDocumentMeta();
                this.track('listView');
            })
            .catch((err) => {
                this.error = err && err.status === 404 ? this.$t('public.listNotFound') : this.$t('public.unableToLoad');
            })
            .finally(() => {
                this.isLoading = false;
            });
    },
    methods: {
        printList() {
            window.print();
        },
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
            const categories = this.chartCategories;
            if (!canvas || !categories.length) return;
            const total = categories.reduce((sum, cat) => sum + cat.subtotalWeight, 0);
            if (!total) return;

            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }

            const unit = this.totalUnit;
            this.chart = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: categories.map((cat) => `${cat.name}: ${weightUtils.MgToWeight(cat.subtotalWeight, unit)} ${unit}`),
                    datasets: [{
                        data: categories.map((cat) => cat.subtotalWeight),
                        backgroundColor: categories.map((cat) => cat.color),
                        borderColor: this.getChartBg(),
                        borderWidth: 3,
                        hoverBorderColor: 'rgb(50,50,50)',
                        hoverBorderWidth: 2,
                        hoverOffset: 0,
                    }],
                },
                options: {
                    responsive: false,
                    cutout: '60%',
                    animation: { duration: 400 },
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false },
                    },
                    onHover: (event, elements) => {
                        this.hoveredCategoryIdx = elements.length > 0 ? elements[0].index : null;
                        if (event.native) {
                            event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                        }
                    },
                },
            });
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
            const title = `${this.list.name || 'Public list'} - ZenPak`;
            const description = this.list.summary || this.list.description || `A gear list on ZenPak by ${this.username || 'a hiker'}.`;
            const url = window.location.href;

            document.title = title;

            const setMeta = (attr, key, value) => {
                let el = document.querySelector(`meta[${attr}="${key}"]`);
                if (!el) {
                    el = document.createElement('meta');
                    el.setAttribute(attr, key);
                    document.head.appendChild(el);
                }
                el.setAttribute('content', value);
            };

            setMeta('property', 'og:type', 'website');
            setMeta('property', 'og:title', title);
            setMeta('property', 'og:description', description);
            setMeta('property', 'og:url', url);
            setMeta('property', 'og:site_name', 'ZenPak');
            setMeta('name', 'twitter:card', 'summary');
            setMeta('name', 'twitter:title', title);
            setMeta('name', 'twitter:description', description);
            setMeta('name', 'description', description);

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
