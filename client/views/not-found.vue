<style lang="scss">
@import "../css/_globals";

.lpNotFound {
    align-items: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 70vh;
    padding: 40px 20px;
    text-align: center;
}


.lpNotFoundCode {
    color: $color-accent;
    font-size: 96px;
    font-weight: 800;
    letter-spacing: -4px;
    line-height: 1;
    margin-bottom: 12px;
}

.lpNotFoundTitle {
    color: $color-text;
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 10px;
}

.lpNotFoundSub {
    color: $color-text-muted;
    font-size: 15px;
    line-height: 1.6;
    margin: 0 0 36px;
    max-width: 320px;
}

.lpNotFoundActions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
}

.lpNotFoundBtn {
    border-radius: $radius-sm;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    padding: 10px 22px;
    text-decoration: none;
    transition: opacity 0.15s;

    &:hover { opacity: 0.8; }

    &--primary {
        background: $color-accent;
        color: #fff;
    }

    &--ghost {
        border: 1px solid $color-border;
        color: $color-text-muted;
    }
}
</style>

<template>
    <div class="lpNotFound">
        <div class="lpNotFoundCode">{{ $t('misc.notFoundCode') }}</div>
        <h1 class="lpNotFoundTitle">{{ $t('misc.notFoundTitle') }}</h1>
        <p class="lpNotFoundSub">{{ $t('misc.notFoundSub') }}</p>
        <div class="lpNotFoundActions">
            <router-link to="/" class="lpNotFoundBtn lpNotFoundBtn--primary">{{ $t('misc.notFoundBackPack') }}</router-link>
            <router-link to="/community" class="lpNotFoundBtn lpNotFoundBtn--ghost">{{ $t('misc.notFoundExploreCommunity') }}</router-link>
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
