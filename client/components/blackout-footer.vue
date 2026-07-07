<style lang="scss">

</style>

<template>
    <div id="lpWelcomeFooter">
        <div class="lpSiteBy">
            {{ $t('dash.footerBuiltOn') }} <a class="lpHref" href="https://github.com/galenmaly/lighterpack" target="_blank" rel="noopener noreferrer">LighterPack</a>.
        </div>
        <div class="lpContact">
            <a class="lpHref" href="/about">{{ $t('dash.footerAbout') }}</a>
            -
            <a class="lpHref" href="https://github.com/zenpakapp/zenpak" target="_blank" rel="noopener noreferrer">{{ $t('dash.footerOpenSource') }}</a>
            -
            <a class="lpHref" href="/privacy">{{ $t('dash.footerPrivacy') }}</a>
            -
            <a class="lpHref" href="/terms">{{ $t('dash.footerTerms') }}</a>
            -
            <a class="lpHref" href="/legal">{{ $t('dash.footerLegal') }}</a>
            -
            <a class="lpHref" href="mailto:info@zenpak.app">{{ $t('dash.footerContact') }}</a>
        </div>
    </div>
</template>

<script>
export default {
    name: 'BlackoutFooter',
};
</script>
