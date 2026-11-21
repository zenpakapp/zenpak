// Icon shapes for client/components/icon.vue: 24x24 grid, drawn with a 2px round stroke.
// The shapes are from Lucide (https://lucide.dev, ISC licence).
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
