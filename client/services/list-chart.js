import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';
const colorUtils = require('../utils/color.js');

Chart.register(DoughnutController, ArcElement, Tooltip);

function extractCategories(processedData) {
    return Object.values(processedData.points);
}

function buildDataset(categories) {
    return {
        data: categories.map((c) => c.total),
        backgroundColor: categories.map((c, i) => colorUtils.rgbToString(c.color || colorUtils.getColor(i))),
        borderColor: 'rgb(245,245,245)',
        borderWidth: 3,
        hoverBorderColor: 'rgb(50,50,50)',
        hoverBorderWidth: 2,
    };
}

export function renderListChart({ chart, canvas, processedData, hoverCallback }) {
    if (!canvas || !processedData) return chart;

    const categories = extractCategories(processedData);

    if (chart) {
        chart._categories = categories;
        chart.data.labels = categories.map((c) => c.name);
        chart.data.datasets[0] = buildDataset(categories);
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
            cutout: '60%',
            animation: { duration: 400 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    displayColors: false,
                    callbacks: {
                        label: () => null,
                    },
                },
            },
            onHover(event, elements, c) {
                const cat = elements.length > 0 ? (c._categories?.[elements[0].index] ?? null) : null;
                if (hoverCallback) hoverCallback(cat);
            },
        },
    });

    newChart._categories = categories;
    return newChart;
}
