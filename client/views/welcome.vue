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

.lpButtonGoogle {
    align-items: center;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    color: $color-text;
    display: flex;
    font-size: $fontSize-base;
    font-weight: $fontWeight-medium;
    gap: 10px;
    justify-content: center;
    margin-top: 16px;
    min-height: 44px;
    text-decoration: none;
    transition: border-color 0.15s;
    width: 100%;

    &:hover {
        border-color: $color-accent;
    }
}

.lpOAuthDivider {
    align-items: center;
    color: $color-text-muted;
    display: flex;
    font-size: $fontSize-xs;
    gap: 10px;
    margin: 14px 0;
    text-transform: uppercase;

    &::before,
    &::after {
        background: $color-border;
        content: '';
        flex: 1;
        height: 1px;
    }
}

.lpOAuthSetup {
    align-items: center;
    background: rgba(0, 0, 0, 0.55);
    bottom: 0;
    display: flex;
    justify-content: center;
    left: 0;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 100;
}

.lpOAuthSetupCard {
    background: $color-surface;
    border-radius: $radius-lg;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    max-width: 420px;
    padding: 40px;
    width: 90%;
}

.lpOAuthSetupTitle {
    font-size: 24px;
    font-weight: $fontWeight-bold;
    margin: 0 0 8px;
}

.lpOAuthSetupText {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    margin: 0 0 24px;
}

.lpOAuthSetupInput {
    background: $color-bg;
    border: 1.5px solid $color-border;
    border-radius: $radius-md;
    box-sizing: border-box;
    font-size: $fontSize-base;
    padding: 10px 14px;
    transition: border-color 0.15s;
    width: 100%;

    &:focus {
        border-color: $color-accent;
        outline: none;
    }
}

</style>

<template>
    <div id="lpWelcomeContainer">
        <section class="lpWelcomeHero">
            <div class="lpContainer lpWelcomeHeroInner">
                <div class="lpWelcomeHeroCopy">
                    <span class="lpWelcomeEyebrow">JustPack</span>
                    <h1 class="lpWelcomeHeadline">
                        Pack faster.
                        <span>Leave lighter.</span>
                    </h1>
                    <p class="lpWelcomeDeck">
                        Build your gear library, create pack lists, track your weight to the gram — and share with the community.
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
                            Save your lists online, sync across devices, and get started in minutes.
                        </p>
                        <a href="/api/auth/google" class="lpButtonGoogle">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                            </svg>
                            Continue with Google
                        </a>
                        <div class="lpOAuthDivider"><span>or</span></div>
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

        <div v-if="showOnboarding" class="lpOAuthSetup">
            <div class="lpOAuthSetupCard">
                <templatePicker @select="onTemplateSelect" @dismiss="onTemplateSkip" />
            </div>
        </div>

        <div v-if="showUsernameSetup" class="lpOAuthSetup">
            <div class="lpOAuthSetupCard">
                <h2 class="lpOAuthSetupTitle">Choose your username</h2>
                <p class="lpOAuthSetupText">Pick a unique username to complete your account setup.</p>
                <div class="lpError" v-if="setupError">{{ setupError }}</div>
                <input
                    v-model="setupUsername"
                    class="lpOAuthSetupInput"
                    type="text"
                    placeholder="Username"
                    maxlength="20"
                    @keyup.enter="submitUsername"
                />
                <div class="lpButtons" style="margin-top: 16px;">
                    <button
                        class="lpButton lpButtonPrimary"
                        :disabled="setupLoading"
                        @click="submitUsername"
                    >
                        {{ setupLoading ? 'Saving…' : 'Confirm username' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import blackoutFooter from '../components/blackout-footer.vue';
import globalAlerts from '../components/global-alerts.vue';
import registerForm from '../components/register-form.vue';
import SigninForm from '../components/signin-form.vue';
import templatePicker from '../components/template-picker.vue';
import { push } from '../services/navigation';

export default {
    name: 'Welcome',
    components: {
        blackoutFooter,
        globalAlerts,
        registerForm,
        SigninForm,
        templatePicker,
    },
    data() {
        return {
            activeTab: 'gear',
            previewTabs: [
                { id: 'gear', label: 'Gear library', src: '/images/screenshot-gear.png' },
                { id: 'list', label: 'Pack list', src: '/images/screenshot-list.png' },
                { id: 'community', label: 'Community', src: '/images/screenshot-community.png' },
            ],
            setupUsername: '',
            setupToken: '',
            setupError: '',
            setupLoading: false,
            showUsernameSetup: false,
            showOnboarding: false,
        };
    },
    created() {
        const query = this.$route?.query || {};
        if (query.setup === 'username') return;
        if (query.onboarding === '1' && this.$store.state.library) {
            this.showOnboarding = true;
            return;
        }
        if (this.$store.state.library) {
            push('/');
        }
    },
    mounted() {
        const getCookie = (name) => {
            const c = document.cookie.split('; ').find((r) => r.startsWith(`${name}=`));
            return c ? decodeURIComponent(c.split('=')[1]) : '';
        };
        const token = getCookie('oauth_setup_token');
        if (token) {
            this.setupToken = token;
            this.setupUsername = getCookie('oauth_setup_suggested') || '';
            this.showUsernameSetup = true;
            document.cookie = 'oauth_setup_token=; path=/; max-age=0';
            document.cookie = 'oauth_setup_suggested=; path=/; max-age=0';
        }
    },
    methods: {
        async onTemplateSelect(templateData) {
            if (templateData) {
                await this.$store.dispatch('saveRemoteWithTemplate', templateData);
            }
            push('/');
        },
        onTemplateSkip() {
            push('/');
        },
        async submitUsername() {
            this.setupLoading = true;
            this.setupError = '';
            try {
                const res = await fetch('/api/auth/google/set-username', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ username: this.setupUsername, setupToken: this.setupToken }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Error');
                document.cookie = 'oauth_setup_token=; path=/; max-age=0';
                document.cookie = 'oauth_setup_suggested=; path=/; max-age=0';
                window.location.replace('/welcome?onboarding=1');
            } catch (e) {
                this.setupError = e.message;
            } finally {
                this.setupLoading = false;
            }
        },
    },
};
</script>
