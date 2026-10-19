<style lang="scss">
// Line breaks typed in the description are kept; runs of spaces still collapse.
.lpLinkifiedText {
    white-space: pre-line;
}

.lpLinkifiedLink {
    color: inherit;
    overflow-wrap: anywhere;
    text-decoration: underline;

    &:hover {
        text-decoration-thickness: 2px;
    }
}
</style>

<template>
    <span class="lpLinkifiedText"><template v-for="(segment, index) in segments"><a v-if="segment.type === 'link'" :key="`link-${index}`" class="lpLinkifiedLink" :href="segment.href" target="_blank" :rel="rel">{{ segment.value }}</a><span v-else :key="`text-${index}`">{{ segment.value }}</span></template></span>
</template>

<script>
import {
    MAX_DESCRIPTION_LINKS, USER_LINK_REL, collapseLineBreaks, splitLinks,
} from '../utils/linkify';

// Text whose URLs are clickable. Built from plain pieces, never v-html, so nothing typed by a
// user can inject markup.
export default {
    name: 'LinkifiedText',
    props: {
        text: { type: String, default: '' },
        maxLinks: { type: Number, default: MAX_DESCRIPTION_LINKS },
    },
    computed: {
        segments() {
            return splitLinks(collapseLineBreaks(this.text), this.maxLinks);
        },
        rel() {
            return USER_LINK_REL;
        },
    },
};
</script>
