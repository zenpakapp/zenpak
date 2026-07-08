<style lang="scss">
@import "../css/_globals";

.creatorLinks {
    border-top: 1px solid $color-border;
    padding-top: 28px;
}

.creatorLinksSectionTitle {
    font-size: 18px;
    font-weight: $fontWeight-bold;
    margin: 0 0 16px;
}

.creatorLinksField {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
}

.creatorLinksLabel {
    color: $color-text-muted;
    font-size: $fontSize-xs;
    font-weight: $fontWeight-bold;
    letter-spacing: $letterSpacing-caps;
    text-transform: uppercase;
}

.creatorLinksTextarea {
    appearance: none;
    background: $color-bg;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    box-sizing: border-box;
    color: $color-text;
    font-family: $font-family-base;
    font-size: $fontSize-base;
    min-height: 80px;
    padding: 10px 12px;
    resize: vertical;
    width: 100%;

    &:focus {
        border-color: $color-accent;
        box-shadow: 0 0 0 4px rgba(var(--color-accent-rgb), 0.1);
        outline: none;
    }
}

.creatorLinksNote {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    margin: 0;
}
</style>

<template>
    <section class="creatorLinks">
        <h3 class="creatorLinksSectionTitle">{{ $t('guide.creatorLinks.title') }}</h3>

        <template v-if="isGuide">
            <div class="creatorLinksField">
                <span class="creatorLinksLabel">{{ $t('guide.creatorLinks.disclosure') }}</span>
                <textarea class="creatorLinksTextarea" :value="creator.disclosure" @input="updateDisclosure($event.target.value)" />
            </div>
            <p class="creatorLinksNote">{{ $t('guide.creatorLinks.note') }}</p>
        </template>
        <p v-else class="creatorLinksNote">{{ $t('guide.creatorLinks.unavailable') }}</p>

    </section>
</template>

<script>
import upgradePrompt from './upgrade-prompt.vue';
import { hasFeature, FEATURES } from '../services/entitlements.js';

export default {
    name: 'CreatorLinks',
    components: { upgradePrompt },
    computed: {
        creator() {
            return this.$store.state.library.creator;
        },
        isGuide() {
            const lib = this.$store.state && this.$store.state.library;
            return lib && lib.entitlements && hasFeature(lib.entitlements, FEATURES.CREATOR_LINKS);
        },
    },
    methods: {
        updateDisclosure(value) {
            this.$store.commit('updateCreatorSettings', { disclosure: value });
        },
    },
};
</script>
