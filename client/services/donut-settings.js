'use strict';

function donutDatasetStyle() {
    const style = getComputedStyle(document.documentElement);
    return {
        borderColor: style.getPropertyValue('--color-bg').trim() || 'rgb(245,245,245)',
        borderWidth: 3,
        hoverBorderColor: 'rgb(50,50,50)',
        hoverBorderWidth: 2,
        hoverOffset: 0,
    };
}

function donutOptions() {
    return {
        cutout: '60%',
        animation: { duration: 400 },
    };
}

module.exports = { donutDatasetStyle, donutOptions };
