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

    .lpAboutNav {
        margin-bottom: 20px;

        a {
            color: $color-text-muted;
            font-size: $fontSize-sm;
            text-decoration: none;

            &:hover { color: $color-text; }
        }
    }

    .lpAboutBuiltBy {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        margin-top: 24px;
    }

    .lpAboutActions {
        align-items: center;
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-top: 32px;
    }

    .lpAboutCtaRow {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;
    }

    .lpAboutKofiNote {
        color: var(--color-text-muted);
        font-size: 14px;
        margin: 0;
        text-align: center;
    }

    .lpAboutKofi {
        color: $color-accent;
        font-weight: 600;
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
            <router-link to="/">← Back to ZenPak</router-link>
        </nav>
        <h1>ZenPak</h1>
        <p>An independent, open-source packing tool — built by one person, kept alive by the community.</p>

        <h2>Why this project exists</h2>
        <p>Looking for the right app to plan my Camino de Santiago, LighterPack was the obvious choice. But it hadn't evolved in years. So I forked it, modernized the stack, and started building the features I wished it had — a better gear library, public sharing, community discovery, and a way to share affiliate links without being pushy about it.</p>
        <p>No VC funding, no growth hacking, no dark patterns. Just someone trying to build something useful before heading out on trail.</p>

        <h2>Where it's going</h2>
        <p>This started as a hiking tool. But packing is packing — whether you're heading out on trail, loading up a bike, or flying with carry-on only. The next version of this project is called <strong>ZenPak</strong>: a simple, universal packing tool for any kind of trip.</p>

        <h2>Plans</h2>
        <ul>
            <li><strong>Base</strong> — Free. The full app. No paywalled core features.</li>
            <li><strong>Trail</strong> — Support the project. Customize your public profile with an avatar, bio, and links.</li>
            <li><strong>Guide</strong> — Everything in Trail, plus affiliate links, promo codes, and insights to see who's reading your lists.</li>
        </ul>

        <p class="lpAboutBuiltBy">Built by <router-link class="lpHref" to="/u/fxbenard">fxbenard</router-link> — currently preparing for the Camino de Santiago, and one day the Shikoku Henro.</p>

        <div class="lpAboutActions">
            <div class="lpAboutCtaRow">
                <button class="lpButton lpButtonSecondary" @click="showTrailPrompt = true">Become a Trail</button>
                <button class="lpButton" @click="showGuidePrompt = true">Become a Guide</button>
            </div>
            <p class="lpAboutKofiNote">Trail also available on <a class="lpAboutKofi" href="https://ko-fi.com/zenpak" target="_blank" rel="noopener noreferrer">Ko-fi</a> — pay what you want, 1 year of Trail access.</p>
            <upgrade-prompt v-if="showTrailPrompt" tier="trail" feature="publicProfile" mode="modal" :open="showTrailPrompt" @close="showTrailPrompt = false" />
            <upgrade-prompt v-if="showGuidePrompt" tier="guide" feature="creatorLinks" mode="modal" :open="showGuidePrompt" @close="showGuidePrompt = false" />
        </div>
    </div>
</template>

<script>
import upgradePrompt from '../components/upgrade-prompt.vue';

export default {
    name: 'AboutView',
    components: { upgradePrompt },
    data() {
        return { showTrailPrompt: false, showGuidePrompt: false };
    },
};
</script>
