const colorUtils = require('../utils/color.js');
const weightUtils = require('../utils/weight.js');
const breakpoints = require('../utils/breakpoints.js');
const { donutDatasetStyle, donutOptions } = require('./donut-settings');

let chartModulePromise = null;

async function loadChart() {
    if (!chartModulePromise) {
        chartModulePromise = import(/* webpackChunkName: "vendor-chart" */ 'chart.js')
            .then(({
                Chart, DoughnutController, ArcElement, Tooltip,
            }) => {
                Chart.register(DoughnutController, ArcElement, Tooltip);
                return Chart;
            });
    }
    return chartModulePromise;
}

function extractCategories(processedData) {
    return Object.values(processedData.points);
}

function buildDataset(categories) {
    return {
        data: categories.map((c) => c.total),
        backgroundColor: categories.map((c, i) => colorUtils.rgbToString(c.color || colorUtils.getColor(i))),
        ...donutDatasetStyle(),
    };
}

export default async function renderListChart({
    chart, canvas, processedData, hoverCallback, unit,
}) {
    if (!canvas || !processedData) return chart;

    const Chart = await loadChart();
    const categories = extractCategories(processedData);

    if (chart) {
        chart.lpCategories = categories;
        chart.lpUnit = unit;
        chart.data.labels = categories.map((c) => c.name);
        const ds = buildDataset(categories);
        chart.data.datasets[0].data = ds.data;
        chart.data.datasets[0].backgroundColor = ds.backgroundColor;
        chart.data.datasets[0].borderColor = ds.borderColor;
        chart.update();
        return chart;
    }

    const newChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: categories.map((c) => c.name),
            datasets: [buildDataset(categories)],
        },
        options: {
            responsive: false,
            ...donutOptions(),
            plugins: {
                legend: { display: false },
                tooltip: {
                    // Phones show the touched slice in a text line under the donut instead.
                    filter: () => !(typeof window !== 'undefined' && window.matchMedia(`(max-width: ${breakpoints.phone}px)`).matches),
                    caretSize: 0,
                    displayColors: false,
                    callbacks: {
                        label: (context) => {
                            const cat = context.chart.lpCategories?.[context.dataIndex];
                            if (!cat) return null;
                            const chartUnit = context.chart.lpUnit;
                            return `${weightUtils.MgToWeight(cat.total, chartUnit)} ${chartUnit} (${Math.round((cat.basePercent || 0) * 100)}%)`;
                        },
                    },
                },
            },
            onHover(event, elements, c) {
                const cat = elements.length > 0 ? (c.lpCategories?.[elements[0].index] ?? null) : null;
                if (hoverCallback) hoverCallback(cat);
                if (event.native) {
                    event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            },
        },
    });

    newChart.lpCategories = categories;
    newChart.lpUnit = unit;
    return newChart;
}
