<template>
    <teleport to="head">
        <link v-for="locale in locales" :key="locale.code" rel="alternate" :hreflang="locale.code" :href="href">
        <link rel="alternate" hreflang="x-default" :href="href">
    </teleport>
</template>

<script>
import { LOCALES } from '../../shared/locales';

// The page is the same address in every language: one alternate link per language the app speaks.
export default {
    name: 'HreflangLinks',
    props: { href: { type: String, required: true } },
    data() {
        return { locales: LOCALES };
    },
};
</script>
