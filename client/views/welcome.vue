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

.lpWelcomeSignals {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    list-style: none;
    margin: 28px 0 0;
    padding: 0;
}

.lpWelcomeSignals li {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 16px;
    min-height: 92px;
    padding: 14px 16px;
}

.lpWelcomeSignalTitle {
    color: rgba(255, 255, 255, 0.96);
    display: block;
    font-size: 13px;
    font-weight: $fontWeight-bold;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
    text-transform: uppercase;
}

.lpWelcomeSignalText {
    color: rgba(255, 255, 255, 0.72);
    display: block;
    font-size: 13px;
    line-height: 1.45;
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

    .lpWelcomeSignals li {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255, 255, 255, 0.08);
    }

    .lpWelcomeSignalText {
        color: rgba(232, 232, 232, 0.72);
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

        .lpWelcomeSignals li {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.08);
        }

        .lpWelcomeSignalText {
            color: rgba(232, 232, 232, 0.72);
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

    .lpWelcomeSignals {
        grid-template-columns: 1fr;
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
                        Organize your gear library, compare pack setups, see your pack weight instantly, and keep the familiar LighterPack flow with a cleaner, more modern entry point.
                    </p>
                    <ul class="lpWelcomeSignals">
                        <li>
                            <span class="lpWelcomeSignalTitle">Gear library</span>
                            <span class="lpWelcomeSignalText">Keep gear organized across categories, setups, and repeat trips.</span>
                        </li>
                        <li>
                            <span class="lpWelcomeSignalTitle">Pack analysis</span>
                            <span class="lpWelcomeSignalText">See base weight, worn items, and consumables without losing the classic flow.</span>
                        </li>
                        <li>
                            <span class="lpWelcomeSignalTitle">Community sharing</span>
                            <span class="lpWelcomeSignalText">Publish clean public lists and share them with other hikers.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        <main class="lpWelcomeMain">
            <div class="lpContainer lpWelcomeGrid">
                <section class="lpWelcomeProof">
                    <div class="lpWelcomeProofHeader">
                        <div>
                            <span class="lpWelcomeProofEyebrow">Product preview</span>
                            <h2 class="lpWelcomeProofTitle">
                                See the app at a glance
                            </h2>
                            <p class="lpWelcomeProofText">
                                Organize your gear library, compare pack setups, and keep category totals clear. Share clean public lists and stay connected to the community without leaving the core app experience.
                            </p>
                        </div>
                        <ul class="lpWelcomeMiniList">
                            <li>Track gear by category</li>
                            <li>Visualize worn vs. consumable weight</li>
                            <li>Share lists with the community</li>
                        </ul>
                    </div>

                    <div class="lpWelcomeScreenshotFrame">
                        <div class="lpWelcomeScreenshotChrome">
                            <span class="lpWelcomeScreenshotDot" />
                            <span class="lpWelcomeScreenshotDot" />
                            <span class="lpWelcomeScreenshotDot" />
                            <span class="lpWelcomeScreenshotLabel">Live product preview</span>
                        </div>
                        <div class="lpWelcomeScreenshotBody">
                            <img
                                id="lpWelcomeScreenshot"
                                src="/images/screenshot-new.png"
                                alt="LighterPack+ interface preview"
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
    created() {
        if (this.$store.state.library) {
            push('/');
        }
    },
};
</script>
