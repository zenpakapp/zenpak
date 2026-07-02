<template>
    <img
        class="zenpakBrandAsset"
        :src="src"
        :alt="decorative ? '' : alt"
        :aria-hidden="decorative ? 'true' : null"
        draggable="false"
        decoding="async"
    >
</template>

<script>
export default {
    name: 'ZenpakBrandAsset',
    props: {
        variant: {
            type: String,
            default: 'wordmark',
        },
        alt: {
            type: String,
            default: 'ZenPak',
        },
        decorative: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        src() {
            const variants = {
                mark: '/brand/zenpak-z.svg',
                app: '/brand/zenpak-z-app.svg',
                wordmark: '/brand/zenpak-z-wordmark.svg',
                'wordmark-white': '/brand/zenpak-z-wordmark-white.svg',
            };
            return variants[this.variant] || variants.wordmark;
        },
    },
};
</script>
