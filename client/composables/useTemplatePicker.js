import backpackingData from '../data/templates/3-day-backpacking.json';
import ultralightData from '../data/templates/weekend-ultralight.json';
import thruHikeData from '../data/templates/thru-hike-pct.json';
import fourSeasonData from '../data/templates/4-season-backpacking.json';

export const templates = [
    {
        id: '3-day-backpacking',
        name: '3-Day Backpacking',
        description: '30 items across 6 categories — shelter, sleep, clothing, water, food, essentials',
        data: backpackingData,
    },
    {
        id: 'weekend-ultralight',
        name: 'Weekend Ultralight',
        description: '22 items, sub-10kg target — tarp, quilt, frameless pack',
        data: ultralightData,
    },
    {
        id: 'thru-hike-pct',
        name: 'PCT Thru-Hike',
        description: '29 items, ultralight long-distance setup — Zpacks, EE, Hyperlite, inReach',
        data: thruHikeData,
    },
    {
        id: '4-season-backpacking',
        name: '4-Season Backpacking',
        description: '30 items for winter/alpine — MSR Access, WM 0°F bag, microspikes, hardshell',
        data: fourSeasonData,
    },
];
