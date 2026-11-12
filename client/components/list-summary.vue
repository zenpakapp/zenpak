<template>
    <div class="lpListSummary">
        <div class="lpChartContainer">
            <canvas ref="chartCanvas" class="lpChart" height="260" width="260" />
            <p class="lpChartReadout" aria-live="polite">
                {{ chartReadout }}
            </p>
        </div>
        <div class="lpTotalsContainer">
            <button type="button" class="lpCategoriesToggle" :aria-expanded="categoriesOpen ? 'true' : 'false'" @click="categoriesOpen = !categoriesOpen">
                {{ $t('list.categoriesToggle', { count: categories.length }) }}
            </button>
            <ul class="lpTotals lpTable lpDataTable" :class="{ lpCategoriesFolded: !categoriesOpen }">
                <li class="lpRow lpHeader">
                    <span class="lpCell">&nbsp;</span>
                    <span class="lpCell">
                        {{ $t('public.category') }}
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell">
                        {{ $t('public.price') }}
                    </span>
                    <span class="lpCell">
                        {{ $t('public.weight') }}
                    </span>
                </li>
                <li v-for="category in categories" :key="category.id" :class="{'hover': hoveredCategoryId === category.id, 'lpTotalCategory lpRow': true}">
                    <span class="lpCell lpLegendCell">
                        <colorPicker v-if="category.displayColor" :color="colorToHex(category.displayColor)" @colorChange="updateColor(category, $event)" />
                    </span>
                    <span class="lpCell">
                        {{ category.name }}
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell lpNumber">
                        {{ displayPrice(category.subtotalPrice, library.currencySymbol) }}
                    </span>
                    <span class="lpCell lpNumber">
                        <span class="lpDisplaySubtotal" :mg="category.subtotalWeight">{{ displayWeight(category.subtotalWeight, displayUnit) }}</span> <span class="lpSubtotalUnit">{{ displayUnit }}</span>
                    </span>
                </li>
                <li class="lpRow lpFooter lpTotal">
                    <span class="lpCell" />
                    <span class="lpCell lpSubtotal" :title="list.totalQty + ' ' + $t('public.items')">
                        {{ $t('public.total') }}
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell lpNumber lpSubtotal" :title="list.totalQty + ' ' + $t('public.items')">
                        {{ displayPrice(list.totalPrice, library.currencySymbol) }}
                    </span>
                    <span class="lpCell lpNumber lpSubtotal">
                        <span class="lpTotalValue" :title="list.totalQty + ' ' + $t('public.items')">
                            {{ displayWeight(list.totalWeight, displayUnit) }}
                        </span>
                        <span class="lpTotalUnit">{{ displayUnit }}</span>
                    </span>
                </li>
                <li v-if="list.totalConsumableWeight" data-weight-type="consumable" class="lpRow lpFooter lpBreakdown lpConsumableWeight">
                    <span class="lpCell" />
                    <span class="lpCell lpSubtotal">
                        {{ $t('public.consumable') }}
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell lpNumber lpSubtotal">
                        {{ displayPrice(list.totalConsumablePrice, library.currencySymbol) }}
                    </span>
                    <span class="lpCell lpNumber lpSubtotal">
                        <span class="lpDisplaySubtotal" :mg="list.totalConsumableWeight">{{ displayWeight(list.totalConsumableWeight, displayUnit) }}</span>
                        <span class="lpSubtotalUnit">{{ displayUnit }}</span>
                    </span>
                </li>
                <li v-if="list.totalWornWeight" data-weight-type="worn" class="lpRow lpFooter lpBreakdown lpWornWeight">
                    <span class="lpCell" />
                    <span class="lpCell lpSubtotal">
                        {{ $t('public.worn') }}
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell lpNumber" />
                    <span class="lpCell lpNumber lpSubtotal">
                        <span class="lpDisplaySubtotal" :mg="list.totalWornWeight">{{ displayWeight(list.totalWornWeight, displayUnit) }}</span>
                        <span class="lpSubtotalUnit">{{ displayUnit }}</span>
                    </span>
                </li>
                <li v-if="list.totalWornWeight || list.totalConsumableWeight" data-weight-type="base" class="lpRow lpFooter lpBreakdown lpBaseWeight">
                    <span class="lpCell" />
                    <span class="lpCell lpSubtotal" :title="displayWeight(list.totalPackWeight, displayUnit) + ' ' + displayUnit + ' ' + $t('public.packWeightHint')">
                        {{ $t('public.baseWeight') }}
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell lpNumber" />
                    <span class="lpCell lpNumber lpSubtotal">
                        <span class="lpDisplaySubtotal" :mg="list.totalBaseWeight" :title="displayWeight(list.totalPackWeight, displayUnit) + ' ' + displayUnit + ' ' + $t('public.packWeightHint')">
                            {{ displayWeight(list.totalBaseWeight, displayUnit) }}
                        </span>
                        <span class="lpSubtotalUnit">{{ displayUnit }}</span>
                    </span>
                </li>
            </ul>
            <div v-if="$slots.default" class="lpTotalsActions">
                <slot />
            </div>
        </div>
    </div>
</template>

<script>
import { markRaw } from 'vue';
import colorPicker from './colorpicker.vue';
import { renderListChart } from '../services/list-chart';
import { useUtils } from '../composables/useUtils';

const colorUtils = require('../utils/color.js');

const { displayWeight, displayPrice } = useUtils();

function scheduleIdle(callback) {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(callback, { timeout: 1500 });
        return;
    }
    setTimeout(callback, 0);
}

export default {
    name: 'ListSummary',
    components: {
        colorPicker,
    },
    props: {
        list: { type: Object, required: true },
    },
    data() {
        return {
            chart: null,
            hoveredCategoryId: null,
            chartFrame: null,
            chartScheduled: false,
            themeObserver: null,
            categoriesOpen: false,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        // Phones: the canvas tooltip is too small to read, so the touched slice is named here instead.
        chartReadout() {
            const category = this.categories.find((c) => c.id === this.hoveredCategoryId);
            if (!category) return '';
            return `${category.name} · ${displayWeight(category.subtotalWeight, this.displayUnit)} ${this.displayUnit}`;
        },
        categories() {
            return this.list.categoryIds
                .map((id) => this.library.getCategoryById(id))
                .filter(Boolean);
        },
        displayUnit() {
            return this.library.totalUnit;
        },
    },
    watch: {
        '$store.state.library.defaultListId': 'scheduleChartUpdate',
        'list.totalWeight': 'scheduleChartUpdate',
        'list.categoryIds': 'scheduleChartUpdate',
    },
    mounted() {
        this.scheduleChartUpdate();
        this.themeObserver = new MutationObserver(() => this.scheduleChartUpdate());
        this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    },
    beforeUnmount() {
        if (this.chartFrame) cancelAnimationFrame(this.chartFrame);
        if (this.themeObserver) this.themeObserver.disconnect();
        if (this.chart && typeof this.chart.destroy === 'function') {
            this.chart.destroy();
            this.chart = null;
        }
    },
    methods: {
        displayWeight,
        displayPrice,
        scheduleChartUpdate() {
            if (this.chartScheduled) return;
            this.chartScheduled = true;
            this.chartFrame = requestAnimationFrame(() => {
                this.chartFrame = null;
                scheduleIdle(() => {
                    this.chartScheduled = false;
                    this.updateChart();
                });
            });
        },
        async updateChart() {
            if (!this.library || typeof this.library.renderChart !== 'function') return;
            const chartData = this.library.renderChart();

            if (!chartData) {
                // No weight to draw (empty list, or switched to one): drop the previous list's donut.
                if (this.chart && typeof this.chart.destroy === 'function') {
                    this.chart.destroy();
                    this.chart = null;
                }
                const canvas = this.$refs.chartCanvas;
                const context = canvas && canvas.getContext('2d');
                if (context) context.clearRect(0, 0, canvas.width, canvas.height);
            }

            if (chartData) {
                this.chart = markRaw(await renderListChart({
                    chart: this.chart,
                    canvas: this.$refs.chartCanvas,
                    processedData: chartData,
                    hoverCallback: this.chartHover,
                    unit: this.displayUnit,
                }));
            }
            return chartData;
        },
        chartHover(chartItem) {
            if (chartItem && chartItem.id) {
                this.hoveredCategoryId = chartItem.id;
            } else {
                this.hoveredCategoryId = null;
            }
        },
        updateColor(category, color) {
            category.color = colorUtils.hexToRgb(color);
            category.displayColor = colorUtils.rgbToString(colorUtils.hexToRgb(color));
            this.$store.commit('updateCategoryColor', category);
            this.updateChart();
        },
        colorToHex(color) {
            return colorUtils.rgbToHex(colorUtils.stringToRgb(color));
        },
    },
};

</script>

<style lang="scss">
@import "../css/_globals";

.lpLegend {
    &:hover {
        border-color: $color-text-muted;
        cursor: pointer;
    }
}

.lpChart {
    aspect-ratio: 1;
    height: auto !important;
    max-width: 100%;
}

// Desktop reads the canvas tooltip; the readout is for phones only.
.lpChartReadout {
    display: none;
}

// The toggle only exists on phones, where nine category rows would push the list off the screen.
.lpCategoriesToggle {
    display: none;
}

@media (max-width: 480px) {
    .lpChartReadout {
        display: block;
        font-size: $fontSize-sm;
        margin: 4px 0 0;
        min-height: 1.4em;
        text-align: center;
    }

    .lpCategoriesToggle {
        background: transparent;
        border: 0;
        color: $color-accent-text;
        cursor: pointer;
        display: block;
        font-size: $fontSize-sm;
        font-weight: $fontWeight-bold;
        margin: 0 auto 8px;
        padding: 8px 12px;

        &::after {
            content: " ▾";
        }

        &[aria-expanded="true"]::after {
            content: " ▴";
        }
    }

    .lpCategoriesFolded {
        .lpHeader,
        .lpTotalCategory {
            display: none;
        }
    }
}
</style>
