const { Chart, DoughnutController, ArcElement, Tooltip } = require('chart.js');
Chart.register(DoughnutController, ArcElement, Tooltip);

listReport = function () {
    const $list = $('.lpList');
    const $categories = $('.lpCategories');
    const $chartContainer = $('.lpChart');
    const $imageModal = $('#lpImageDialog');
    const $modalOverlay = $('.lpModalOverlay');
    let chart = null;
    let chartCategories = [];

    function init() {
        initEventHandlers();

        if (typeof chartData !== 'undefined') {
            chartData = JSON.parse(unescape(chartData));
            chartCategories = Object.values(chartData.points);

            const canvas = $chartContainer.get(0);
            if (canvas && chartCategories.length) {
                const defaultColors = [{ r: 27, g: 119, b: 211 }, { r: 206, g: 24, b: 54 }, { r: 242, g: 208, b: 0 }, { r: 122, g: 179, b: 23 }, { r: 130, g: 33, b: 198 }, { r: 232, g: 110, b: 28 }];
                chart = new Chart(canvas, {
                    type: 'doughnut',
                    data: {
                        labels: chartCategories.map((c) => c.name),
                        datasets: [{
                            data: chartCategories.map((c) => c.total),
                            backgroundColor: chartCategories.map((c, i) => {
                                const col = c.color || defaultColors[i % defaultColors.length];
                                return `rgb(${col.r},${col.g},${col.b})`;
                            }),
                            borderColor: 'rgb(245,245,245)',
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
                            tooltip: {
                                caretSize: 0,
                                displayColors: false,
                                callbacks: { label: () => null },
                            },
                        },
                        onHover(event, elements) {
                            const cat = elements.length > 0 ? chartCategories[elements[0].index] : null;
                            chartHover(cat);
                        },
                    },
                });
            }
        }
    }

    function MgToWeight(value, unit) {
        if (unit == 'g') return Math.round(100 * value / 1000.0) / 100;
        if (unit == 'kg') return Math.round(100 * value / 1000000.0) / 100;
        if (unit == 'oz') return Math.round(100 * value / 28349.5) / 100;
        if (unit == 'lb') return Math.round(100 * value / 453592.0) / 100;
    }

    function chartHover(chartItem) {
        $('.hover').removeClass('hover');
        if (chartItem && chartItem.id) {
            $(`#total_${chartItem.id}`).addClass('hover');
        }
    }

    function updateSubtotalsUnit(unit) {
        $('.lpDisplaySubtotal').each(function () {
            $(this).text(MgToWeight(parseFloat($(this).attr('mg')), unit));
            $(this).next().text(unit);
        });
    }

    function initEventHandlers() {
        $list.on('click', '.lpUnitSelect', function (evt) {
            evt.stopPropagation();
            $(this).toggleClass('lpOpen');
            const value = $('.lpUnit', this).val();
            $('ul', this).removeClass('oz lb g kg');
            $('ul', this).addClass(value);
        });

        $list.on('click', '.lpUnitSelect li', function () {
            const unit = $(this).text();
            const $unitSelect = $(this).parents('.lpUnitSelect');
            $('.lpDisplay', $unitSelect).text(unit);
            $('.lpUnit', $unitSelect).val(unit);
            if ($(this).parents('.lpTotalUnit').length) {
                $('.lpTotalValue', $(this).parents('.lpTotal')).text(MgToWeight(parseFloat($('.lpMG', $unitSelect).val()), unit));
                updateSubtotalsUnit(unit);
            } else {
                $('.lpWeight').each(function () {
                    const $weightCell = $(this).parent();
                    $(this).text(MgToWeight(parseFloat($('.lpMG', $weightCell).val()), unit));
                    $('.lpDisplay', $weightCell).text(unit);
                });
            }
        });

        $categories.on('click', '.lpItemImage', function () {
            const imageUrl = $(this).attr('href');
            const $modalImage = $(`<img src='${imageUrl}' />`);
            $imageModal.empty().append($modalImage);
            $modalImage.load(() => {
                $imageModal.show();
                $modalOverlay.show();
                centerDialog();
            });
        });

        $modalOverlay.on('click', () => {
            if (!$('.lpDialog:visible').hasClass('sticky')) {
                $modalOverlay.fadeOut();
                $imageModal.fadeOut();
            }
        });

        $(document).on('click', () => {
            $('.lpOpen').removeClass('lpOpen');
        });
    }

    init();
};

function centerDialog() {
    const $dialog = $('.dialog:visible');
    $dialog.css('margin-top', `${-1 * $dialog.outerHeight() / 2}px`);
}

$(() => {
    listReport();
});
