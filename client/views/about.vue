<style lang="scss">
@import "../css/_globals";

.lpAbout {
    #lpWelcomeFooter {
        background: none;
        border-top: 1px solid $color-border;
        color: $color-text-muted;
        display: block;
        font-size: $fontSize-ui;
        margin-top: 60px; // space-exempt: a layout size, not a step of the scale
        padding: $space-20 0 0;
        position: static;
        text-align: center;
        z-index: auto;
    }

    margin: 0 auto;
    max-width: $width-reading;
    padding: $space-40 $space-20 80px; // space-exempt: a layout size, not a step of the scale

    h1 {
        font-size: 28px;
        font-weight: $fontWeight-bold;
        margin-bottom: $space-8;
    }

    h2 {
        font-size: $fontSize-lg;
        font-weight: $fontWeight-bold;
        margin: $space-32 0 $space-8;
    }

    p,
    li {
        color: $color-text-muted;
        font-size: 15px;
        line-height: 1.6;
        max-width: 58ch;
        text-wrap: pretty;
    }

    ul {
        padding-left: $space-18;
    }

    .lpAboutNav {
        margin-bottom: $space-20;

        a {
            color: $color-text-muted;
            font-size: $fontSize-ui;
            text-decoration: none;

            &:hover { color: $color-text; }
        }
    }

    .lpAboutBuiltBy {
        color: $color-text-muted;
        font-size: 15px;
        margin-top: $space-24;
    }

    .lpAboutActions {
        align-items: center;
        display: flex;
        flex-direction: column;
        gap: $space-16;
        margin-top: $space-32;
    }

    .lpAboutCtaRow {
        display: flex;
        flex-wrap: wrap;
        gap: $space-12;
        justify-content: center;
    }

    .lpAboutKofiNote {
        color: var(--color-text-muted);
        font-size: 15px;
        margin: 0;
        text-align: center;
    }

    .lpAboutKofi {
        color: $color-accent-text;
        font-weight: $fontWeight-bold;
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }
}
</style>

<template>
    <div class="lpAbout">
        <nav class="lpAboutNav">
            <router-link to="/">
                {{ $t('misc.backToZenPak') }}
            </router-link>
        </nav>
        <h1>{{ $t('misc.aboutTitle') }}</h1>
        <p>{{ $t('misc.aboutDeck') }}</p>

        <h2>{{ $t('misc.originTitle') }}</h2>
        <p>{{ $t('misc.originP1') }}</p>
        <p>{{ $t('misc.originP2') }}</p>
        <p>{{ $t('misc.originActivities') }}</p>
        <p>{{ $t('misc.originP3') }}</p>

        <h2>{{ $t('misc.differentTitle') }}</h2>
        <ul>
            <li>{{ $t('misc.differentItem1') }}</li>
            <li>{{ $t('misc.differentItemShare') }}</li>
            <li>{{ $t('misc.differentItem2') }}</li>
            <li>{{ $t('misc.differentItem3') }}</li>
            <li>{{ $t('misc.differentItem4') }}</li>
            <li>{{ $t('misc.differentItem5') }}</li>
        </ul>

        <h2>{{ $t('misc.plansTitle') }}</h2>
        <ul>
            <li><strong>{{ $t('misc.planNameBase') }}.</strong> {{ $t('misc.planDescBase') }}</li>
            <li><strong>{{ $t('misc.planNameKin') }}.</strong> {{ $t('misc.planDescKin') }}</li>
            <li><strong>{{ $t('misc.planNameWayfarer') }}.</strong> {{ $t('misc.planDescWayfarer') }}</li>
        </ul>

        <p class="lpAboutBuiltBy">
            {{ $t('misc.builtByPrefix') }} <router-link class="lpAboutKofi" to="/u/fxbenard">fxbenard</router-link>{{ $t('misc.builtBySuffix') }}
        </p>

        <div class="lpAboutActions">
            <div class="lpAboutCtaRow">
                <button class="lpButton lpButtonSecondary" @click="showTrailPrompt = true">
                    {{ $t('misc.becomeKin') }}
                </button>
                <button class="lpButton" @click="showGuidePrompt = true">
                    {{ $t('misc.becomeWayfarer') }}
                </button>
            </div>
            <p class="lpAboutKofiNote">
                {{ $t('auth.or') }} <a class="lpAboutKofi" href="https://ko-fi.com/zenpak" target="_blank" rel="noopener noreferrer">{{ $t('misc.kofiCta') }}</a>, {{ $t('misc.kofiNote') }}.
            </p>
            <upgrade-prompt v-if="showTrailPrompt" tier="trail" feature="publicProfile" mode="modal" :open="showTrailPrompt" @close="showTrailPrompt = false" />
            <upgrade-prompt v-if="showGuidePrompt" tier="guide" feature="creatorLinks" mode="modal" :open="showGuidePrompt" @close="showGuidePrompt = false" />
        </div>
        <blackout-footer />
    </div>
</template>

<script>
import { defineAsyncComponent } from 'vue';

import blackoutFooter from '../components/blackout-footer.vue';

const upgradePrompt = defineAsyncComponent(() => import(/* webpackChunkName: "about-upgrade" */ '../components/upgrade-prompt.vue'));

export default {
    name: 'AboutView',
    components: { upgradePrompt, blackoutFooter },
    data() {
        return { showTrailPrompt: false, showGuidePrompt: false };
    },
};
</script>
