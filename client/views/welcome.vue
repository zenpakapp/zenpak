<style lang="scss">
@import "../css/_globals";

$welcome-page-transition-end: rgba(248, 247, 245, 1);
$welcome-page-transition-mid: rgba(248, 247, 245, 0.78);
$welcome-page-transition-hero: rgba(248, 247, 245, 0.55);
$welcome-page-transition-hero-soft: rgba(248, 247, 245, 0.18);
$welcome-page-screenshot-start: rgba(255, 255, 255, 0.96);
$welcome-page-screenshot-end: rgba(244, 242, 237, 0.92);

#lpWelcomeContainer {
    background:
        radial-gradient(circle at top right, rgba(var(--color-accent-rgb), 0.08), transparent 30%),
        linear-gradient(180deg, rgba($welcome-page-transition-end, 0.96) 0%, $welcome-page-transition-end 100%);
    color: $color-text;
    min-height: 100vh;
}

.lpContainer {
    margin: 0 auto;
    max-width: 1180px;
    padding: 0 $spacingMedium;
}

.lpWelcomeHero {
    padding: 42px 0 38px;
    position: relative;

    &::before {
        background:
            linear-gradient(135deg, rgba(19, 57, 37, 0.96), rgba(45, 122, 79, 0.82)),
            url("/images/lp_bg2.jpg") center 30% / cover no-repeat;
        box-shadow: 0 28px 60px rgba(var(--color-shadow-rgb), 0.14);
        content: "";
        inset: 0;
        position: absolute;
    }

    &::after {
        background:
            linear-gradient(180deg, transparent 0%, transparent 68%, $welcome-page-transition-hero-soft 82%, $welcome-page-transition-hero 100%),
            linear-gradient(120deg, rgba(255, 255, 255, 0.12), transparent 55%),
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 35%);
        content: "";
        inset: 0;
        position: absolute;
    }
}

.lpWelcomeHeroInner {
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
    position: relative;
    z-index: 1;
}

.lpWelcomeHeroCopy {
    color: rgba(255, 255, 255, 0.94);
    max-width: 680px;
    padding: 12px 8px 18px 0;
}

.lpWelcomeEyebrow {
    color: rgba(255, 255, 255, 0.74);
    display: inline-block;
    font-size: 12px;
    font-weight: $fontWeight-bold;
    letter-spacing: 0.18em;
    margin-bottom: 18px;
    text-transform: uppercase;
}

.lpWelcomeHeadline {
    color: #fff;
    font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
    font-size: clamp(36px, 6vw, 66px);
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 0.96;
    margin: 0;
    max-width: 620px;

    span {
        color: #8ddba8;
        display: block;
    }
}

.lpWelcomeDeck {
    color: rgba(255, 255, 255, 0.82);
    font-size: 19px;
    line-height: 1.65;
    margin: 22px 0 0;
    max-width: 620px;
}

.lpWelcomeStats {
    display: flex;
    gap: 32px;
    margin: 28px 0 0;
}

.lpWelcomeStat {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.lpWelcomeStatNum {
    color: #fff;
    font-size: 22px;
    font-weight: $fontWeight-bold;
    line-height: 1.2;
}

.lpWelcomeStatLabel {
    color: rgba(255, 255, 255, 0.62);
    font-size: 13px;
}

.lpWelcomeFeatures {
    background: $color-surface;
    border-bottom: 1px solid $color-border;
    border-top: 1px solid $color-border;
    padding: 48px 0;
}

.lpWelcomeFeaturesGrid {
    display: grid;
    gap: 32px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.lpWelcomeFeatureItem {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.lpWelcomeFeatureNum {
    color: $color-accent;
    font-size: $fontSize-xs;
    font-weight: $fontWeight-bold;
    letter-spacing: 0.14em;
    text-transform: uppercase;
}

.lpWelcomeFeatureTitle {
    font-size: 20px;
    font-weight: $fontWeight-bold;
    margin: 0;
}

.lpWelcomeFeatureText {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    line-height: 1.6;
    margin: 0;
}

.lpWelcomeFaq {
    padding: 56px 0 48px;
}

.lpWelcomeFaqTitle {
    font-size: 28px;
    font-weight: $fontWeight-bold;
    margin: 0 0 28px;
}

.lpWelcomeFaqList {
    display: grid;
    gap: 0;
    max-width: 680px;
}

.lpWelcomeFaqItem {
    border-bottom: 1px solid $color-border;
    padding: 16px 0;

    &:first-child {
        border-top: 1px solid $color-border;
    }
}

.lpWelcomeFaqQ {
    color: $color-text;
    cursor: pointer;
    font-size: $fontSize-base;
    font-weight: $fontWeight-medium;
    list-style: none;
    user-select: none;

    &::-webkit-details-marker {
        display: none;
    }

    &::after {
        color: $color-text-muted;
        content: "+";
        float: right;
        font-size: 20px;
        font-weight: 300;
        line-height: 1;
    }
}

details[open] .lpWelcomeFaqQ::after {
    content: "−";
}

.lpWelcomeFaqA {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    line-height: 1.65;
    margin: 10px 0 0;
    max-width: 600px;
}

.lpWelcomeMain {
    margin-top: 0;
    padding-bottom: 48px;
    padding-top: 26px;
    position: relative;
    z-index: 2;

    &::before {
        background: linear-gradient(180deg, rgba($welcome-page-transition-end, 0) 0%, $welcome-page-transition-mid 58%, $welcome-page-transition-end 100%);
        content: "";
        height: 130px;
        left: 0;
        pointer-events: none;
        position: absolute;
        right: 0;
        top: -84px;
        z-index: 0;
    }
}

.lpWelcomeGrid {
    align-items: start;
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
    position: relative;
    z-index: 1;
}

.lpWelcomeProof {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: 24px;
    box-shadow: 0 24px 60px rgba(var(--color-shadow-rgb), 0.12);
    overflow: hidden;
    padding: 22px;
}

.lpWelcomeProofHeader {
    align-items: end;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-bottom: 18px;
}

.lpWelcomeProofEyebrow {
    color: $color-accent;
    display: block;
    font-size: 11px;
    font-weight: $fontWeight-bold;
    letter-spacing: 0.14em;
    margin-bottom: 8px;
    text-transform: uppercase;
}

.lpWelcomeProofTitle {
    font-size: 31px;
    line-height: 1.06;
    margin: 0;
}

.lpWelcomeProofText {
    color: $color-text-muted;
    line-height: 1.55;
    margin: 10px 0 0;
    max-width: 580px;
}

.lpWelcomeMiniList {
    display: grid;
    gap: 10px;
    list-style: none;
    margin: 0;
    min-width: 210px;
    padding: 0;
}

.lpWelcomeMiniList li {
    align-items: center;
    background: rgba(var(--color-accent-rgb), 0.08);
    border-radius: 12px;
    color: $color-text;
    display: flex;
    font-size: 13px;
    font-weight: $fontWeight-medium;
    gap: 10px;
    padding: 10px 12px;
}

.lpWelcomeMiniList li::before {
    color: $color-accent;
    content: "•";
    font-size: 18px;
    line-height: 1;
}

.lpWelcomeProofTabs {
    display: flex;
    gap: 6px;
    margin-top: 12px;
}

.lpWelcomeProofTab {
    background: transparent;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    color: $color-text-muted;
    cursor: pointer;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-medium;
    padding: 6px 14px;
    transition: all 0.15s;

    &:hover {
        border-color: $color-accent;
        color: $color-accent;
    }
}

.lpWelcomeProofTabActive {
    background: $color-accent;
    border-color: $color-accent;
    color: #fff;

    &:hover {
        color: #fff;
    }
}

.lpWelcomeScreenshotFrame {
    background: linear-gradient(180deg, $welcome-page-screenshot-start, $welcome-page-screenshot-end);
    border: 1px solid $color-border;
    border-radius: 20px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
    overflow: hidden;
}

.lpWelcomeScreenshotChrome {
    align-items: center;
    border-bottom: 1px solid rgba(var(--color-shadow-rgb), 0.08);
    display: flex;
    gap: 8px;
    padding: 14px 18px;
}

.lpWelcomeScreenshotDot {
    background: rgba(var(--color-shadow-rgb), 0.16);
    border-radius: 50%;
    display: block;
    height: 12px;
    width: 12px;
}

.lpWelcomeScreenshotLabel {
    color: $color-text-muted;
    font-size: 12px;
    font-weight: $fontWeight-bold;
    letter-spacing: 0.08em;
    margin-left: 8px;
    text-transform: uppercase;
}

.lpWelcomeScreenshotBody {
    padding: 18px;
}

#lpWelcomeScreenshot {
    border-radius: 14px;
    box-shadow: 0 14px 36px rgba(var(--color-shadow-rgb), 0.16);
    display: block;
    width: 100%;
}

.lpWelcomeAuthRail {
    display: grid;
    gap: 18px;
}

.lpWelcomeCard {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: 24px;
    box-shadow: 0 22px 50px rgba(var(--color-shadow-rgb), 0.12);
    color: $color-text;
    overflow: hidden;
    padding: 24px;
}

.lpWelcomeProof,
.lpWelcomeCard {
    backdrop-filter: blur(4px);
}

.lpWelcomeCardPrimary {
    border-top: 4px solid $color-accent;
}

.lpWelcomeCardSecondary {
    background: $color-surface-elevated;
}

.lpWelcomeCardKicker {
    color: $color-accent;
    display: block;
    font-size: 11px;
    font-weight: $fontWeight-bold;
    letter-spacing: 0.14em;
    margin-bottom: 10px;
    text-transform: uppercase;
}

.lpWelcomeCardTitle {
    font-size: 32px;
    line-height: 1.04;
    margin: 0;
}

.lpWelcomeCardText {
    color: $color-text-muted;
    line-height: 1.55;
    margin: 10px 0 0;
}

.lpWelcomeCardTextStrong {
    color: $color-text;
    font-weight: $fontWeight-medium;
}

.lpWelcomeCard .lpError {
    margin: 0 0 12px;
}

.lpWelcomeCard .lpRegister,
.lpWelcomeCard .signin {
    margin-top: 20px;
}

.lpWelcomeCard .lpButtons {
    gap: 10px;
}

.lpWelcomeCard .lpButton {
    min-height: 48px;
}

.lpWelcomeCardSecondary .lpButton {
    background: $color-control;
    border-color: $color-border;
    box-shadow: none;
    color: $color-text;
}

.lpWelcomeCardSecondary .lpButton:hover {
    background: $color-control-hover;
    border-color: $color-accent;
    color: $color-accent;
}

.lpWelcomeCardSecondary .signin-forgot-password {
    font-size: 13px;
}

#lpWelcomeContainer #lpWelcomeFooter {
    align-items: center;
    background: transparent;
    border-top: 1px solid rgba(var(--color-shadow-rgb), 0.08);
    bottom: auto;
    color: $color-text-muted;
    left: auto;
    margin-top: 18px;
    padding: 20px $spacingMedium 28px;
    position: static;
    right: auto;
    z-index: auto;
}

#lpWelcomeContainer #lpWelcomeFooter .lpSiteBy,
#lpWelcomeContainer #lpWelcomeFooter .lpContact {
    font-size: 14px;
}

[data-theme="dark"] {
    #lpWelcomeContainer {
        background:
            radial-gradient(circle at top right, rgba(var(--color-accent-rgb), 0.12), transparent 30%),
            linear-gradient(180deg, rgba(17, 17, 17, 0.96) 0%, rgba(17, 17, 17, 1) 100%);
    }

    .lpWelcomeHero::after {
        background:
            linear-gradient(180deg, transparent 0%, transparent 68%, rgba(17, 17, 17, 0.16) 82%, rgba(17, 17, 17, 0.52) 100%),
            linear-gradient(120deg, rgba(255, 255, 255, 0.08), transparent 55%),
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 35%);
    }

    .lpWelcomeMain::before {
        background: linear-gradient(180deg, rgba(17, 17, 17, 0) 0%, rgba(17, 17, 17, 0.68) 58%, rgba(17, 17, 17, 1) 100%);
    }

    .lpWelcomeMiniList li {
        background: rgba(var(--color-accent-rgb), 0.16);
    }

    .lpWelcomeScreenshotFrame {
        background: linear-gradient(180deg, rgba(32, 32, 35, 0.96), rgba(24, 24, 27, 0.94));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .lpWelcomeScreenshotChrome {
        border-bottom-color: rgba(255, 255, 255, 0.06);
    }

    .lpWelcomeScreenshotDot {
        background: rgba(255, 255, 255, 0.18);
    }
}

@media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]):not([data-theme="dark"]) {
        #lpWelcomeContainer {
            background:
                radial-gradient(circle at top right, rgba(var(--color-accent-rgb), 0.12), transparent 30%),
                linear-gradient(180deg, rgba(17, 17, 17, 0.96) 0%, rgba(17, 17, 17, 1) 100%);
        }

        .lpWelcomeHero::after {
            background:
                linear-gradient(180deg, transparent 0%, transparent 68%, rgba(17, 17, 17, 0.16) 82%, rgba(17, 17, 17, 0.52) 100%),
                linear-gradient(120deg, rgba(255, 255, 255, 0.08), transparent 55%),
                radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 35%);
        }

        .lpWelcomeMain::before {
            background: linear-gradient(180deg, rgba(17, 17, 17, 0) 0%, rgba(17, 17, 17, 0.68) 58%, rgba(17, 17, 17, 1) 100%);
        }

        .lpWelcomeMiniList li {
            background: rgba(var(--color-accent-rgb), 0.16);
        }

        .lpWelcomeScreenshotFrame {
            background: linear-gradient(180deg, rgba(32, 32, 35, 0.96), rgba(24, 24, 27, 0.94));
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .lpWelcomeScreenshotChrome {
            border-bottom-color: rgba(255, 255, 255, 0.06);
        }

        .lpWelcomeScreenshotDot {
            background: rgba(255, 255, 255, 0.18);
        }
    }
}

@media (max-width: 980px) {
    .lpWelcomeHeroInner,
    .lpWelcomeGrid {
        grid-template-columns: 1fr;
    }

    .lpWelcomeMain {
        margin-top: 0;
    }

    .lpWelcomeProofHeader {
        align-items: start;
        flex-direction: column;
    }

    .lpWelcomeMiniList {
        min-width: 0;
        width: 100%;
    }
}

@media (max-width: 768px) {
    .lpWelcomeFeaturesGrid {
        gap: 24px;
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .lpWelcomeHero {
        padding-top: 20px;
    }

    .lpWelcomeHero::before {
        inset: 0;
    }

    .lpWelcomeHeadline {
        font-size: 40px;
    }

    .lpWelcomeDeck {
        font-size: 17px;
    }

    .lpWelcomeProof,
    .lpWelcomeCard {
        border-radius: 20px;
        padding: 18px;
    }

    .lpWelcomeProofTitle,
    .lpWelcomeCardTitle {
        font-size: 26px;
    }

    .lpWelcomeGrid {
        gap: 18px;
    }

    .lpWelcomeMain {
        margin-top: 0;
    }

    #lpWelcomeContainer #lpWelcomeFooter {
        align-items: start;
        display: grid;
        gap: 8px;
        justify-content: start;
    }
}

</style>

<template>
    <div id="lpWelcomeContainer">
        <section class="lpWelcomeHero">
            <div class="lpContainer lpWelcomeHeroInner">
                <div class="lpWelcomeHeroCopy">
                    <span class="lpWelcomeEyebrow">LighterPack+</span>
                    <h1 class="lpWelcomeHeadline">
                        Pack lighter.
                        <span>Hike further.</span>
                    </h1>
                    <p class="lpWelcomeDeck">
                        Build your gear library, build pack lists, track your base weight to the gram — and share lists with the community.
                    </p>
                    <div class="lpWelcomeStats">
                        <div class="lpWelcomeStat">
                            <span class="lpWelcomeStatNum">100%</span>
                            <span class="lpWelcomeStatLabel">Free to start</span>
                        </div>
                        <div class="lpWelcomeStat">
                            <span class="lpWelcomeStatNum">Open source</span>
                            <span class="lpWelcomeStatLabel">Fork of lighterpack.com</span>
                        </div>
                        <div class="lpWelcomeStat">
                            <span class="lpWelcomeStatNum">No ads</span>
                            <span class="lpWelcomeStatLabel">Ever</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="lpWelcomeFeatures">
            <div class="lpContainer">
                <div class="lpWelcomeFeaturesGrid">
                    <div class="lpWelcomeFeatureItem">
                        <span class="lpWelcomeFeatureNum">01</span>
                        <h3 class="lpWelcomeFeatureTitle">Gear library</h3>
                        <p class="lpWelcomeFeatureText">Add every piece of kit once — weight, brand, category. Reuse across trips, filter, compare.</p>
                    </div>
                    <div class="lpWelcomeFeatureItem">
                        <span class="lpWelcomeFeatureNum">02</span>
                        <h3 class="lpWelcomeFeatureTitle">Pack lists</h3>
                        <p class="lpWelcomeFeatureText">Build lists per trip, see base weight / worn / consumables live. Packing mode to check items off as you go.</p>
                    </div>
                    <div class="lpWelcomeFeatureItem">
                        <span class="lpWelcomeFeatureNum">03</span>
                        <h3 class="lpWelcomeFeatureTitle">Community</h3>
                        <p class="lpWelcomeFeatureText">Publish lists publicly, follow other hikers, discover curated loadouts from the community.</p>
                    </div>
                </div>
            </div>
        </section>

        <main class="lpWelcomeMain">
            <div class="lpContainer lpWelcomeGrid">
                <section class="lpWelcomeProof">
                    <div class="lpWelcomeProofHeader">
                        <span class="lpWelcomeProofEyebrow">Product preview</span>
                        <div class="lpWelcomeProofTabs">
                            <button
                                v-for="tab in previewTabs"
                                :key="tab.id"
                                class="lpWelcomeProofTab"
                                :class="{ lpWelcomeProofTabActive: activeTab === tab.id }"
                                @click="activeTab = tab.id"
                            >
                                {{ tab.label }}
                            </button>
                        </div>
                    </div>

                    <div class="lpWelcomeScreenshotFrame">
                        <div class="lpWelcomeScreenshotChrome">
                            <span class="lpWelcomeScreenshotDot" />
                            <span class="lpWelcomeScreenshotDot" />
                            <span class="lpWelcomeScreenshotDot" />
                            <span class="lpWelcomeScreenshotLabel">{{ previewTabs.find(t => t.id === activeTab).label }}</span>
                        </div>
                        <div class="lpWelcomeScreenshotBody">
                            <img
                                id="lpWelcomeScreenshot"
                                :src="previewTabs.find(t => t.id === activeTab).src"
                                :alt="previewTabs.find(t => t.id === activeTab).label"
                            >
                        </div>
                    </div>
                </section>

                <aside class="lpWelcomeAuthRail">
                    <section class="lpWelcomeCard lpWelcomeCardPrimary">
                        <span class="lpWelcomeCardKicker">New here</span>
                        <h2 class="lpWelcomeCardTitle">
                            Create an account
                        </h2>
                        <p class="lpWelcomeCardText">
                            Save your lists online, keep them synced, and start with a setup that still feels like classic LighterPack.
                        </p>
                        <registerForm />
                    </section>

                    <section class="lpWelcomeCard lpWelcomeCardSecondary">
                        <span class="lpWelcomeCardKicker">Returning users</span>
                        <h2 class="lpWelcomeCardTitle">
                            Sign in
                        </h2>
                        <p class="lpWelcomeCardText lpWelcomeCardTextStrong">
                            Jump back into your lists right away.
                        </p>
                        <SigninForm />
                    </section>
                </aside>
            </div>
        </main>

        <section class="lpWelcomeFaq">
            <div class="lpContainer">
                <h2 class="lpWelcomeFaqTitle">Questions</h2>
                <div class="lpWelcomeFaqList">
                    <details class="lpWelcomeFaqItem">
                        <summary class="lpWelcomeFaqQ">What's the difference with lighterpack.com?</summary>
                        <p class="lpWelcomeFaqA">This is a modern open-source fork — same core list editor, but with a gear library, community discover, packing mode, public profiles, and ongoing development. The original site hasn't been updated since 2020.</p>
                    </details>
                    <details class="lpWelcomeFaqItem">
                        <summary class="lpWelcomeFaqQ">Is it really free?</summary>
                        <p class="lpWelcomeFaqA">Yes — gear library, lists, weight tracking, and sharing are yours, free forever. Trail helps keep the lights on. Guide unlocks affiliate links and insights.</p>
                    </details>
                    <details class="lpWelcomeFaqItem">
                        <summary class="lpWelcomeFaqQ">Can I import my existing lists?</summary>
                        <p class="lpWelcomeFaqA">Yes. Import via CSV from lighterpack.com or any spreadsheet. Export works the same way.</p>
                    </details>
                </div>
            </div>
        </section>

        <div class="lpContainer">
            <globalAlerts />
            <blackoutFooter />
        </div>
    </div>
</template>

<script>
import blackoutFooter from '../components/blackout-footer.vue';
import globalAlerts from '../components/global-alerts.vue';
import registerForm from '../components/register-form.vue';
import SigninForm from '../components/signin-form.vue';
import { push } from '../services/navigation';

export default {
    name: 'Welcome',
    components: {
        blackoutFooter,
        globalAlerts,
        registerForm,
        SigninForm,
    },
    data() {
        return {
            activeTab: 'gear',
            previewTabs: [
                { id: 'gear', label: 'Gear library', src: '/images/screenshot-gear.png' },
                { id: 'list', label: 'Pack list', src: '/images/screenshot-list.png' },
                { id: 'community', label: 'Community', src: '/images/screenshot-community.png' },
            ],
        };
    },
    created() {
        if (this.$store.state.library) {
            push('/');
        }
    },
};
</script>
