import backpackingData from '../data/templates/3-day-backpacking.json';
import ultralightData from '../data/templates/weekend-ultralight.json';
import thruHikeData from '../data/templates/thru-hike-pct.json';
import fourSeasonData from '../data/templates/4-season-backpacking.json';

export const templates = [
    {
        id: 'weekend-ultralight',
        data: ultralightData,
    },
    {
        id: '3-day-backpacking',
        data: backpackingData,
    },
    {
        id: 'thru-hike-pct',
        data: thruHikeData,
    },
    {
        id: '4-season-backpacking',
        data: fourSeasonData,
    },
];
