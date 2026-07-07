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
        <h1>Why ZenPak</h1>
        <p>An open-source gear list tool — built by one person, maintained for the people who care about their base weight.</p>

        <h2>The origin</h2>
        <p>Planning my Camino de Santiago, LighterPack was the obvious choice. Everyone in the ultralight community used it. But it hadn't been updated in years — no community features, no profiles, no way for gear creators to share lists with affiliate links without hacking something together.</p>
        <p>So I forked it. Modernized the stack. Built the features I wanted: community discovery, season tags, follow system, creator tools. Kept everything that made LighterPack good — the simplicity, the weight chart, the CSV round-trip.</p>
        <p>No VC, no growth hacking, no gear database trying to tell you what to buy. You manage your gear. The app stays out of the way.</p>

        <h2>What's different</h2>
        <ul>
            <li>Community discover — browse real lists from real hikers, filter by season and base weight</li>
            <li>Season and activity tags — 3-Season, Thru-hike, Winter Camping, Ultralight, on each list</li>
            <li>Public profiles and follow system — find the packers worth following</li>
            <li>Creator layer — affiliate links and insights, for people who earn from gear recommendations</li>
            <li>Self-hosting — fully open-source, no account needed, no lock-in</li>
        </ul>

        <h2>Plans</h2>
        <ul>
            <li><strong>Base</strong> — Free. The full app. No paywalled core features.</li>
            <li><strong>Kin</strong> — Support the project. Enhanced public profile, full JSON export, supporter badge.</li>
            <li><strong>Wayfarer</strong> — Everything in Kin, plus affiliate links, promo codes, and insights (views, copies, clicks).</li>
        </ul>

        <p class="lpAboutBuiltBy">Built by <router-link class="lpHref" to="/u/fxbenard">fxbenard</router-link> — preparing for the Camino de Santiago, and one day the Shikoku Henro.</p>

        <div class="lpAboutActions">
            <div class="lpAboutCtaRow">
                <button class="lpButton lpButtonSecondary" @click="showTrailPrompt = true">Become a Kin</button>
                <button class="lpButton" @click="showGuidePrompt = true">Become a Wayfarer</button>
            </div>
            <p class="lpAboutKofiNote">Or <a class="lpAboutKofi" href="https://ko-fi.com/zenpak" target="_blank" rel="noopener noreferrer">put a stone on the cairn</a> — pay what you want on Ko-fi, get 1 year of Kin.</p>
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
