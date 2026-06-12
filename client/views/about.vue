<style lang="scss">
@import "../css/_globals";

.lpAbout {
    margin: 0 auto;
    max-width: 600px;
    padding: 40px 20px 80px;

    h1 {
        font-size: 28px;
        font-weight: $fontWeight-bold;
        margin-bottom: 8px;
    }

    h2 {
        font-size: $fontSize-md;
        font-weight: 700;
        margin: 32px 0 8px;
    }

    p, li {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        line-height: 1.6;
    }

    ul {
        padding-left: 18px;
    }

    .lpAboutActions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 32px;
    }

    .lpAboutKofi {
        align-items: center;
        background: $color-accent;
        border-radius: $radius-md;
        color: #fff;
        display: inline-flex;
        font-weight: 700;
        gap: 8px;
        padding: 12px 20px;
        text-decoration: none;

        &:hover {
            opacity: 0.9;
            text-decoration: none;
        }
    }
}
</style>

<template>
    <div class="lpAbout">
        <h1>LighterPack+</h1>
        <p>An independent, open-source continuation of LighterPack — built by someone who uses it to plan every hike, and who's currently preparing for the Camino de Santiago.</p>

        <h2>Why this project exists</h2>
        <p>I've been using LighterPack for years. When it stopped evolving, I forked it, modernized the stack, and started adding the features I wished it had — a better gear library, public sharing, community discovery, and a way to share affiliate links without being pushy about it.</p>
        <p>This project is kept alive by a small group of supporters. No VC funding, no growth hacking, no dark patterns. Just a gear nerd trying to build something useful.</p>

        <h2>Plans</h2>
        <ul>
            <li><strong>Base</strong> — Free. The full app. No paywalled core features.</li>
            <li><strong>Trail</strong> — Support the project. Get a public profile with avatar, bio, and links. Managed backups.</li>
            <li><strong>Guide</strong> — Everything in Trail, plus affiliate links, promo codes, and insights to see how your lists help others.</li>
        </ul>

        <div class="lpAboutActions">
            <a class="lpAboutKofi" href="https://ko-fi.com/fxbenard" target="_blank" rel="noopener noreferrer">
                Pack light, give light ☕
            </a>
            <button v-if="!showPrompt" class="lpButton lpButtonSecondary" @click="showPrompt = true">
                I'm interested in Trail or Guide
            </button>
            <upgrade-prompt v-if="showPrompt" tier="trail" feature="publicProfile" mode="modal" :open="showPrompt" @close="showPrompt = false" />
        </div>
    </div>
</template>

<script>
import upgradePrompt from '../components/upgrade-prompt.vue';

export default {
    name: 'AboutView',
    components: { upgradePrompt },
    data() {
        return { showPrompt: false };
    },
};
</script>
