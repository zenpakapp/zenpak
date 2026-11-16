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
