<style lang="scss">
@import "../css/_globals";

.lpNotFound {
    align-items: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 70vh;
    padding: $space-40 $space-20;
    text-align: center;
}

.lpNotFoundCode {
    color: $color-accent-text;
    font-size: 96px; // font-size-exempt: a decorative glyph or hero size
    font-weight: $fontWeight-bold;
    letter-spacing: $letterSpacing-display;
    line-height: 1;
    margin-bottom: $space-12;
}

.lpNotFoundTitle {
    color: $color-text;
    font-size: $fontSize-2xl;
    font-weight: $fontWeight-bold;
    margin: 0 0 $space-10;
}

.lpNotFoundSub {
    color: $color-text-muted;
    font-size: $fontSize-md;
    line-height: 1.6;
    margin: 0 0 $space-40;
    max-width: 320px;
}

.lpNotFoundActions {
    display: flex;
    flex-wrap: wrap;
    gap: $space-10;
    justify-content: center;
}

.lpNotFoundBtn {
    border-radius: $radius-sm;
    cursor: pointer;
    font-size: $fontSize-base;
    font-weight: $fontWeight-medium;
    padding: $space-10 $space-24;
    text-decoration: none;
    transition: opacity $transitionDurationFast;

    &:hover { opacity: 0.8; }

    &--primary {
        background: $color-accent-solid;
        color: $color-on-solid;
    }

    &--ghost {
        border: 1px solid $color-border;
        color: $color-text-muted;
    }
}
</style>

<template>
    <div class="lpNotFound">
        <div class="lpNotFoundCode">
            {{ $t('misc.notFoundCode') }}
        </div>
        <h1 class="lpNotFoundTitle">
            {{ $t('misc.notFoundTitle') }}
        </h1>
        <p class="lpNotFoundSub">
            {{ $t('misc.notFoundSub') }}
        </p>
        <div class="lpNotFoundActions">
            <router-link to="/" class="lpNotFoundBtn lpNotFoundBtn--primary">
                {{ $t('misc.notFoundBackPack') }}
            </router-link>
            <router-link to="/community" class="lpNotFoundBtn lpNotFoundBtn--ghost">
                {{ $t('misc.notFoundExploreCommunity') }}
            </router-link>
        </div>
    </div>
</template>

<script>
export default {
    name: 'NotFound',
    mounted() {
        document.title = this.$t('misc.notFoundPageTitle');
    },
};
</script>
