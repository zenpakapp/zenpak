<style lang="scss">
@import "../css/_welcome";
</style>

<template>
    <div id="lpWelcomeContainer">
        <section class="lpWelcomeHero">
            <div class="lpContainer lpWelcomeHeroInner">
                <div class="lpWelcomeHeroCopy">
                    <span class="lpWelcomeEyebrow">
                        <zenpak-brand-asset class="lpWelcomeEyebrowMark" variant="wordmark-white" alt="ZenPak" />
                    </span>
                    <h1 class="lpWelcomeHeadline">
                        Pack light.
                        <span>Leave calm.</span>
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
                            <span class="lpWelcomeStatLabel">Built on LighterPack</span>
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
                <welcome-proof />

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
                        <summary class="lpWelcomeFaqQ">Already using LighterPack?</summary>
                        <p class="lpWelcomeFaqA">ZenPak picks up where LighterPack left off. It keeps the simple public gear-list spirit, then adds a reusable gear library, public profiles, community discovery, packing mode, and active ongoing development.</p>
                    </details>
                    <details class="lpWelcomeFaqItem">
                        <summary class="lpWelcomeFaqQ">Is it really free?</summary>
                        <p class="lpWelcomeFaqA">Yes. The core stays free and open-source, including self-hosting. Kin is a simple support plan for the hosted app, and Wayfarer is the creator layer with affiliate links, promo codes, and insights.</p>
                    </details>
                    <details class="lpWelcomeFaqItem">
                        <summary class="lpWelcomeFaqQ">Can I import my existing lists?</summary>
                        <p class="lpWelcomeFaqA">Yes. Export your CSV from lighterpack.com or another spreadsheet-based gear list tool, then import it into ZenPak. Lists, items, weights, and notes come across cleanly, so you can move without rebuilding everything by hand.</p>
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

        <welcome-oauth-overlay />
    </div>
</template>

<script>
import blackoutFooter from '../components/blackout-footer.vue';
import globalAlerts from '../components/global-alerts.vue';
import registerForm from '../components/register-form.vue';
import SigninForm from '../components/signin-form.vue';
import templatePicker from '../components/template-picker.vue';
import WelcomeOauthOverlay from '../components/welcome-oauth-overlay.vue';
import WelcomeProof from '../components/welcome-proof.vue';
import ZenpakBrandAsset from '../components/zenpak-brand-asset.vue';
import { push } from '../services/navigation';

export default {
    name: 'Welcome',
    components: {
        blackoutFooter,
        globalAlerts,
        registerForm,
        SigninForm,
        templatePicker,
        WelcomeOauthOverlay,
        WelcomeProof,
        ZenpakBrandAsset,
    },
    data() {
        return {
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
        if (this.$store.state.loggedIn && this.$store.state.library) {
            push('/');
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
    },
};
</script>
