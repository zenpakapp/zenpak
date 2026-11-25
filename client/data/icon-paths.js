// Icon shapes for client/components/icon.vue: 24x24 grid, drawn with a 2px round stroke.
// Most shapes are from Lucide (https://lucide.dev, ISC licence).
// CommonJS, like the other client/data files, so a test can require() it without a bundler.

module.exports = {
    // Name: { paths, fillable }. A fillable icon can be drawn solid, which is how "on" is shown.
    camera: {
        paths: [
            'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z',
            'M12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
        ],
        fillable: false,
    },
    link: {
        paths: [
            'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
            'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
        ],
        fillable: false,
    },
    plus: {
        paths: ['M5 12h14', 'M12 5v14'],
        fillable: false,
    },
    upload: {
        paths: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
        fillable: false,
    },
    download: {
        paths: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
        fillable: false,
    },
    copy: {
        paths: [
            'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z',
            'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
        ],
        fillable: false,
    },
    x: {
        paths: ['M18 6 6 18', 'm6 6 12 12'],
        fillable: false,
    },
    'map-pin': {
        paths: [
            'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
            'M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
        ],
        fillable: false,
    },
    sun: {
        paths: [
            'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
            'M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42',
        ],
        fillable: false,
    },
    calendar: {
        paths: [
            'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
            'M8 2v4m8-4v4M3 10h18',
        ],
        fillable: false,
    },
    compass: {
        paths: [
            'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
            'm16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z',
        ],
        fillable: false,
    },
    scale: {
        paths: [
            'M12 3v18',
            'm19 8 3 8a5 5 0 0 1-6 0zV7',
            'M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1',
            'm5 8 3 8a5 5 0 0 1-6 0zV7',
            'M7 21h10',
        ],
        fillable: false,
    },
    package: {
        paths: [
            'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z',
            'M12 22V12',
            'M3.29 7 12 12 20.71 7',
            'm7.5 4.27 9 5.15',
        ],
        fillable: false,
    },
    backpack: {
        // Traced from the reference. Rectangular cutouts use opposite winding.
        paths: [
            'M9.45 3.85C9.55 2.75 10.4 1.9 11.4 1.9H12.6C13.6 1.9 14.45 2.75 14.55 3.85H13.8C13.7 3.15 13.2 2.65 12.55 2.65H11.45C10.8 2.65 10.3 3.15 10.2 3.85Z',
            'M6.1 22.05C5.25 22.05 4.6 21.3 4.6 20.4V8.95C4.6 6.05 6.75 4 9.5 3.75H14.5C17.25 4 19.4 6.05 19.4 8.95V20.4C19.4 21.3 18.75 22.05 17.9 22.05H17.35V16.7C17.35 15 16 13.65 14.25 13.65H9.75C8 13.65 6.65 15 6.65 16.7V22.05ZM9.15 7.1V8.35H14.85V7.1Z',
            'M7.5 22.05V16.7C7.5 15.45 8.55 14.5 9.75 14.5H14.25C15.45 14.5 16.5 15.45 16.5 16.7V22.05ZM8.9 18.8V20.4H15.3V18.8Z',
            'M4.1 14.45C3.1 14.9 2.35 15.8 2.35 16.85V19.4C2.35 20 2.75 20.45 3.4 20.45H4.1ZM19.9 14.45C20.9 14.9 21.65 15.8 21.65 16.85V19.4C21.65 20 21.25 20.45 20.6 20.45H19.9Z',
        ],
        fillable: true,
        stroke: false,
    },
    'chevron-up': {
        paths: ['m18 15-6-6-6 6'],
        fillable: false,
    },
    'chevron-down': {
        paths: ['m6 9 6 6 6-6'],
        fillable: false,
    },
    shirt: {
        paths: [
            'M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z',
        ],
        fillable: true,
    },
    utensils: {
        paths: [
            'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2',
            'M7 2v20',
            'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7',
        ],
        fillable: true,
    },
};
