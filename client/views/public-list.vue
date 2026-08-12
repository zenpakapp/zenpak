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
        <div v-else-if="error" class="lpPublicUnavailable">
            <section class="lpPublicUnavailableCard">
                <div class="lpPublicUnavailableIcon">×</div>
                <h1>{{ unavailableTitle }}</h1>
                <p>{{ unavailableMessage }}</p>
                <router-link :to="$store.state.loggedIn ? '/' : '/welcome'" class="lpPublicUnavailablePrimary">
                    {{ $store.state.loggedIn ? $t('public.openApp') : $t('public.joinZenPak') }}
                </router-link>
                <router-link to="/community" class="lpPublicUnavailableSecondary">
                    {{ $t('public.backToCommunity') }}
                </router-link>
            </section>
            <router-link :to="$store.state.loggedIn ? '/' : '/welcome'" class="lpPublicUnavailableBrand">
                Made with ♥ ZenPak
            </router-link>
        </div>
        <template v-else-if="list">
            <nav class="lpPublicNav">
                <span class="lpPublicNavLeft">
                    <span v-if="sourceProfile" class="lpPublicNavAuthor">
                        <router-link :to="profileTo(username)">{{ $t('public.backToProfile', { username: authorName }) }}</router-link>
                    </span>
                    <router-link v-else-if="backTo === '/community'" to="/community">{{ $t('public.backToCommunity') }}</router-link>
                    <span v-else-if="username" class="lpPublicNavAuthor">
                        <router-link :to="profileTo(username)">{{ $t('public.backToProfile', { username: authorName }) }}</router-link>
                        <span v-if="authorTier === 'guide'" class="lpPublicListBadge">{{ tierLabel('guide') }}</span>
                        <span v-else-if="authorTier === 'trail'" class="lpPublicListBadge">{{ tierLabel('trail') }}</span>
                    </span>
                    <router-link v-else :to="$store.state.loggedIn ? '/' : '/welcome'">{{ $store.state.loggedIn ? $t('public.backToZenPak') : $t('public.joinZenPak') }}</router-link>
                </span>
                <router-link v-if="isLoggedIn" to="/" class="lpPublicNavMyLists">{{ $t('public.openApp') }}</router-link>
            </nav>

            <h1 class="lpPublicListTitle">{{ list.name }}</h1>
            <p v-if="username" class="lpPublicListAuthor">
                {{ $t('public.byAuthor') }}
                <router-link :to="profileTo(username)" class="lpPublicListAuthorLink">{{ authorName }}</router-link>
                <span v-if="authorTier === 'guide'" class="lpPublicListBadge">{{ tierLabel('guide') }}</span>
                <span v-else-if="authorTier === 'trail'" class="lpPublicListBadge">{{ tierLabel('trail') }}</span>
            </p>
            <p v-if="forkSource" class="lpPublicForkSource">
                {{ $t('dash.source') }}
                <router-link v-if="forkSource.externalId" class="lpPublicForkSourceLink" :to="listTo(forkSource.externalId)">
                    {{ forkSource.listName }}
                </router-link>
                <span v-else>{{ forkSource.listName }}</span>
                <span v-if="forkSource.ownerName" class="lpPublicForkSourceOwner">
                    ·
                    <router-link v-if="forkSource.ownerUsername" class="lpPublicForkSourceLink" :to="profileTo(forkSource.ownerUsername)">
                        {{ forkSource.ownerName }}
                    </router-link>
                    <span v-else>{{ forkSource.ownerName }}</span>
                </span>
            </p>
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
                <p v-if="copyError" class="lpCopyListError">{{ formatCopyError(copyError) }}</p>
                <button v-if="isOwnList" class="lpBtn lpPrintBtn noprint" @click="printList">{{ $t('public.printSaveAsPdf') }}</button>
                <a v-if="canDownloadCsv" class="lpPublicCsvLink noprint" :href="csvUrl" target="_blank" rel="noopener noreferrer">
                    {{ $t('share.exportToCsv') }}
                </a>
                <select class="lpPublicUnitSelect noprint" :value="totalUnit" @change="setDisplayUnit($event.target.value)">
                    <option value="oz">oz</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                </select>
            </div>
            <p v-if="list.summary || list.description" class="lpPublicListSummary">{{ list.summary || list.description }}</p>

            <!-- Chart + tableau catégories -->
            <div v-show="chartCategories.length" class="lpPublicChart">
                <canvas ref="chartCanvas" class="lpPublicChartCanvas" width="200" height="200" />
                <table class="lpPublicChartTable">
                    <thead>
                        <tr>
                            <th>{{ $t('public.category') }}</th>
                            <th v-if="publicFields.price">{{ $t('public.price') }}</th>
                            <th>{{ $t('public.weight') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(cat, i) in chartCategories" :key="cat.id || cat.name" :class="{ lpPublicChartRowActive: hoveredCategoryIdx === i }">
                            <td>
                                <span class="lpPublicChartSwatch" :style="{ background: cat.color }" />
                                {{ cat.name }}
                            </td>
                            <td v-if="publicFields.price">{{ currencySymbol }}{{ formatPrice(cat.subtotalPrice) }}</td>
                            <td><strong>{{ displayWeight(cat.subtotalWeight) }}</strong> {{ totalUnit }}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>{{ $t('public.total') }}</td>
                            <td v-if="publicFields.price">{{ currencySymbol }}{{ formatPrice(list.totalPrice) }}</td>
                            <td><strong>{{ displayWeight(list.totalWeight) }}</strong> {{ totalUnit }}</td>
                        </tr>
                        <tr v-if="list.totalWornWeight">
                            <td>{{ $t('public.worn') }}</td>
                            <td v-if="publicFields.price"></td>
                            <td><strong>{{ displayWeight(list.totalWornWeight) }}</strong> {{ totalUnit }}</td>
                        </tr>
                        <tr>
                            <td>{{ $t('public.baseWeight') }}</td>
                            <td v-if="publicFields.price"></td>
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
                <div v-for="category in categoriesWithColors" :key="category.id || category.name" class="lpPublicListCategory">
                    <div class="lpPublicListCategoryHeader">
                        <h2>
                            <span class="lpPublicListCategorySwatch" :style="{ background: category.color }" />
                            {{ category.name }}
                        </h2>
                        <div class="lpPublicListCategoryTotals">
                            <span v-if="publicFields.price">{{ currencySymbol }}{{ formatPrice(category.subtotalPrice) }}</span>
                            <span><strong>{{ displayWeight(category.subtotalWeight) }}</strong> {{ totalUnit }}</span>
                        </div>
                    </div>
                    <div
                        v-for="item in category.items"
                        :key="item.id || item.name"
                        class="lpPublicListItem"
                        :class="{ 'lpPublicListItemWithPrice': publicFields.price, 'lpPublicListItemOptional': isOptionalItem(item) }"
                    >
                        <img v-if="publicFields.images && item.imageUrl" class="lpPublicListItemImage" :src="item.imageUrl" :alt="item.name" />
                        <div v-else class="lpPublicListItemImagePlaceholder" />
                        <div class="lpPublicListItemBody">
                            <div><span class="lpPublicListItemName">{{ item.name }}</span><span v-if="isOptionalItem(item)" class="lpPublicListItemBadge">{{ $t('public.option') }}</span><span v-if="item.brand || item.description" class="lpPublicListItemMeta"> · <span v-if="item.brand">{{ item.brand }}</span><span v-if="item.brand && item.description"> · </span><span v-if="item.description">{{ item.description }}</span></span></div>
                            <div v-if="item.promoCode" class="lpPublicListItemPromo">
                                <span v-if="item.promoLabel" class="lpPublicListItemPromoLabel">{{ item.promoLabel }}</span>
                                <span class="lpPublicListItemPromoCode">{{ item.promoCode }}</span>
                            </div>
                        </div>
                        <span v-if="publicFields.price" class="lpPublicListItemPrice">{{ item.price ? `${currencySymbol}${formatPrice(item.price)}` : '' }}</span>
                        <span class="lpPublicListItemWeight">{{ displayItemWeight(item) }} {{ itemUnit }}<span v-if="item.qty > 1" class="lpPublicListItemQty"> ×{{ item.qty }}</span></span>
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
import { fetchJson } from '../utils/utils';
import { tierLabel } from '../services/tier-labels.js';
import { useTheme } from '../composables/useTheme';
import { useRouter } from 'vue-router';
import { useBackNav } from '../composables/useBackNav';
const weightUtils = require('../utils/weight.js');
const colorUtils = require('../utils/color.js');

let chartModulePromise = null;

async function loadChart() {
    if (!chartModulePromise) {
        chartModulePromise = import(/* webpackChunkName: "vendor-chart" */ 'chart.js')
            .then(({ Chart, DoughnutController, ArcElement, Tooltip }) => {
                Chart.register(DoughnutController, ArcElement, Tooltip);
                return Chart;
            });
    }
    return chartModulePromise;
}

export default {
    name: 'PublicList',
    setup() {
        useTheme();
        const router = useRouter();
        const { backTo } = useBackNav();
        return { router, backTo };
    },
    data() {
        return {
            isLoading: true,
            error: null,
            errorType: null,
            username: null,
            authorDisplayName: '',
            list: null,
            totalUnit: 'oz',
            itemUnit: 'oz',
            currencySymbol: '$',
            publicFields: { price: false, links: false, images: false, downloadable: false },
            categories: [],
            affiliateDisclosure: null,
            creatorCodes: [],
            authorTier: null,
            forkedFrom: null,
            chart: null,
            copying: false,
            copyError: null,
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
        authorName() {
            return this.authorDisplayName || this.username;
        },
        sourceProfile() {
            const profile = this.$route.query.profile;
            return typeof profile === 'string' && profile ? profile : null;
        },
        isOwnList() {
            return this.$store.state.loggedIn === this.username;
        },
        isCopyable() {
            const v = this.list?.visibility;
            if (v === 'discoverable' || v === 'indexable') return true;
            if (v === 'shareable') return this.list?.copyable === true;
            return false;
        },
        canDownloadCsv() {
            return this.isOwnList || this.publicFields.downloadable === true;
        },
        copyLabel() {
            if (this.copying) return this.$t('public.copying');
            if (this.copySuccess) return this.$t('public.copied');
            return this.$t('public.copyList');
        },
        unavailableTitle() {
            return this.errorType === 'not-found'
                ? this.$t('public.listUnavailableTitle')
                : this.$t('public.unableToLoadTitle');
        },
        unavailableMessage() {
            return this.errorType === 'not-found'
                ? this.$t('public.listUnavailableMessage')
                : this.$t('public.unableToLoadMessage');
        },
        csvUrl() {
            return this.list && this.list.externalId ? `/csv/${this.list.externalId}` : '';
        },
        forkSource() {
            const forkedFrom = this.forkedFrom;
            if (!forkedFrom || !forkedFrom.listName) return null;
            if (forkedFrom.ownerUsername && forkedFrom.ownerUsername === this.username) return null;
            return forkedFrom;
        },
        chartCategories() {
            return this.categoriesWithColors.filter((cat) => cat.subtotalWeight > 0);
        },
        categoriesWithColors() {
            return this.categories.map((cat, i) => ({
                ...cat,
                color: colorUtils.rgbToString(colorUtils.getColor(i)),
            }));
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
                this.authorDisplayName = payload.authorDisplayName || payload.username || '';
                this.authorTier = payload.authorTier || null;
                this.list = payload.list;
                this.totalUnit = localStorage.getItem('lpGuestUnit') || payload.totalUnit || 'oz';
                this.itemUnit = payload.itemUnit || 'oz';
                this.currencySymbol = payload.currencySymbol || '$';
                this.publicFields = payload.publicFields || { price: false, links: false, images: false, downloadable: false };
                this.categories = payload.categories || [];
                this.affiliateDisclosure = payload.affiliateDisclosure;
                this.creatorCodes = payload.creatorCodes || [];
                this.forkedFrom = payload.forkedFrom || null;
                this.updateDocumentMeta();
                this.track('listView');
            })
            .catch((err) => {
                this.errorType = err && err.status === 404 ? 'not-found' : 'load-error';
                this.error = true;
            })
            .finally(() => {
                this.isLoading = false;
            });
    },
    methods: {
        tierLabel,
        setDisplayUnit(unit) {
            this.totalUnit = unit;
            localStorage.setItem('lpGuestUnit', unit);
        },
        routeWithSource(path) {
            return this.$route.query.from === 'community'
                ? { path, query: { from: 'community' } }
                : path;
        },
        listTo(externalId) {
            return this.routeWithSource(`/p/${externalId}`);
        },
        profileTo(username) {
            return this.routeWithSource(`/u/${username}`);
        },
        printList() {
            window.print();
        },
        displayWeight(value) {
            return weightUtils.MgToWeight(value || 0, this.totalUnit);
        },
        displayItemWeight(item) {
            const qty = Number(item.qty);
            const multiplier = qty === 0 ? 1 : (qty || 1);
            return weightUtils.MgToWeight((item.weight || 0) * multiplier, this.itemUnit);
        },
        isOptionalItem(item) {
            return Number(item.qty) === 0;
        },
        formatPrice(value) {
            return value ? Number(value).toFixed(2).replace(/\.00$/, '') : '0';
        },
        getChartBg() {
            const style = getComputedStyle(document.documentElement);
            return style.getPropertyValue('--color-bg').trim() || 'rgb(245,245,245)';
        },
        async renderChart() {
            const canvas = this.$refs.chartCanvas;
            const categories = this.chartCategories;
            if (!canvas || !categories.length) return;
            const total = categories.reduce((sum, cat) => sum + cat.subtotalWeight, 0);
            if (!total) return;
            const Chart = await loadChart();

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
            this.copying = true;
            this.copyError = null;
            try {
                if (!this.$store.state.library && this.$store.state.loggedIn) {
                    await this.$store.dispatch('loadRemote');
                }
                const data = await fetchJson(`/api/community/copy-list/${this.$route.params.externalId}`, { method: 'POST' });
                this.$store.commit('importPublicList', data);
                this.router.push('/');
                this.copySuccess = true;
                setTimeout(() => { this.copySuccess = false; }, 2000);
            } catch (err) {
                if (err && err.status === 403 && err.message === 'Cannot copy your own list') {
                    this.copyError = 'public.copyOwnList';
                } else if (err && err.status === 404) {
                    this.copyError = 'public.copyListUnavailable';
                } else if (err && err.status === 429) {
                    this.copyError = {
                        key: 'public.copyRateLimited',
                        params: {
                            limit: err.limit || 5,
                            minutes: err.retryAfterMinutes || 60,
                        },
                    };
                } else {
                    this.copyError = 'public.copyListFailed';
                }
            } finally {
                this.copying = false;
            }
        },
        formatCopyError(error) {
            if (!error) return '';
            if (typeof error === 'string') return this.$t(error);
            return this.$t(error.key, error.params || {});
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
