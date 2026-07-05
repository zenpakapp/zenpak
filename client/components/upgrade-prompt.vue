<style lang="scss">
@import "../css/_upgrade-prompt";
</style>

<template>
    <div>
        <div v-if="mode === 'inline'" class="lpUpgradeLock" @click="showModal = true">
            <span class="lpUpgradeLockText">{{ inlineText }}</span>
            <span class="lpUpgradeLockCta">Upgrade to {{ tierLabel }} →</span>
        </div>

        <modal :shown="showModal" @hide="closeModal">
            <div class="lpUpgradeModal">
                <div class="lpModalHeader">
                    <div>
                        <div class="lpUpgradeTier">{{ tierLabel }}</div>
                        <h2>Support the project</h2>
                    </div>
                    <a class="lpHref close" @click="closeModal">✕</a>
                </div>

                <p class="lpUpgradeTagline">{{ tagline }}</p>

                <ul class="lpUpgradeBenefits">
                    <li v-for="benefit in benefits" :key="benefit">{{ benefit }}</li>
                </ul>

                <div v-if="stripeEnabled" class="lpUpgradeActions">
                    <div v-if="tier === 'guide'" class="lpUpgradeIntervalToggle">
                        <button
                            class="lpUpgradeIntervalBtn"
                            :class="{ active: interval === 'month' }"
                            @click="interval = 'month'"
                        >Monthly</button>
                        <button
                            class="lpUpgradeIntervalBtn"
                            :class="{ active: interval === 'year' }"
                            @click="interval = 'year'"
                        >Annual <span class="lpUpgradeIntervalSave">−35%</span></button>
                    </div>
                    <div class="lpUpgradePrice">
                        {{ priceDisplay }}<span>{{ priceUnit }}</span>
                    </div>
                    <p v-if="checkoutError" class="lpUpgradeError">{{ checkoutError }}</p>
                    <button class="lpButton" :disabled="checkingOut" @click="checkout">
                        {{ checkingOut ? 'Redirecting…' : `Become a ${tierLabel}` }}
                    </button>
                </div>

                <template v-else>
                    <div v-if="!submitted" class="lpUpgradeActions">
                        <button class="lpButton" @click="showForm = !showForm">
                            {{ showForm ? 'Cancel' : "I'm interested" }}
                        </button>

                        <div v-if="showForm" class="lpUpgradeInterestForm">
                            <div>
                                <label>Your email</label>
                                <input v-model="email" type="email" placeholder="you@example.com" />
                            </div>
                            <div>
                                <label>Which plan?</label>
                                <select v-model="selectedTier">
                                    <option value="trail">Kin</option>
                                    <option value="guide">Wayfarer</option>
                                </select>
                            </div>
                            <div>
                                <label>Message (optional)</label>
                                <textarea v-model="message" placeholder="Tell us a bit about how you use ZenPak" rows="3" />
                            </div>
                            <p v-if="formError" class="lpUpgradeError">{{ formError }}</p>
                            <button class="lpButton" :disabled="submitting" @click="submit">
                                {{ submitting ? 'Sending…' : 'Send' }}
                            </button>
                        </div>
                    </div>

                    <div v-else class="lpUpgradeConfirm">
                        Thanks! We'll be in touch soon.
                    </div>
                </template>
            </div>
        </modal>
    </div>
</template>

<script>
import modal from './modal.vue';
import { fetchJson } from '../utils/utils.js';

const TRAIL_BENEFITS = [
    'Kin badge on your public profile',
    'Public profile with avatar, bio, and links',
    'Improved public list presentation',
];

const GUIDE_BENEFITS = [
    'Public profile with avatar, bio, and links',
    'Wayfarer badge on your profile and lists',
    'Library backup and restore',
    'Insights: views, copies, top lists',
    'Affiliate links and promo codes per item',
    'Automatic affiliate disclosure',
];

const INLINE_TEXTS = {
    publicProfile: 'Kin — Share your gear identity',
    profileCustomization: 'Kin — Personalize your profile',
    creatorInsights: "Your lists inspire others — see who reads them and earn from what you recommend.",
    creatorLinks: 'Wayfarer — Add your affiliate links',
    promoCode: 'Wayfarer — Add a promo code',
};

const TAGLINES = {
    trail: 'A small contribution keeps ZenPak independent and open source. In return, you get a public profile to share your gear identity with the community.',
    guide: 'For those who publish their lists and want to help others gear up. Affiliate links, insights, and a full public profile — everything you need to share your expertise.',
};

export default {
    name: 'UpgradePrompt',
    components: { modal },
    props: {
        tier: {
            type: String,
            required: true,
            validator: v => ['trail', 'guide'].includes(v),
        },
        feature: {
            type: String,
            required: false,
            default: '',
        },
        mode: {
            type: String,
            required: false,
            default: 'inline',
            validator: v => ['inline', 'modal'].includes(v),
        },
        open: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    data() {
        return {
            showModal: this.open,
            showForm: false,
            email: '',
            selectedTier: this.tier,
            message: '',
            submitting: false,
            submitted: false,
            formError: null,
            checkingOut: false,
            checkoutError: null,
            interval: 'month',
        };
    },
    computed: {
        tierLabel() {
            return this.tier === 'trail' ? 'Kin' : 'Wayfarer';
        },
        inlineText() {
            return INLINE_TEXTS[this.feature] || `${this.tierLabel} — Unlock this feature`;
        },
        tagline() {
            return TAGLINES[this.tier];
        },
        benefits() {
            return this.tier === 'trail' ? TRAIL_BENEFITS : GUIDE_BENEFITS;
        },
        stripeEnabled() {
            if (!this.$store.state.loggedIn) return false;
            return this.$store.state.stripeConfigured === true ||
                (this.$store.state.billing && this.$store.state.billing.stripeEnabled);
        },
        priceDisplay() {
            if (this.tier === 'trail') return '€19';
            return this.interval === 'year' ? '€39' : '€5';
        },
        priceUnit() {
            if (this.tier === 'trail') return ' / year';
            return this.interval === 'year' ? ' / year' : ' / month';
        },
    },
    watch: {
        open(val) {
            this.showModal = val;
        },
    },
    methods: {
        closeModal() {
            this.showModal = false;
            this.$emit('close');
        },
        async checkout() {
            this.checkoutError = null;
            this.checkingOut = true;
            try {
                const res = await fetch('/api/billing/checkout-session', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan: this.tier, interval: this.tier === 'trail' ? 'year' : this.interval }),
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else this.checkoutError = data.message || 'Something went wrong — give it another try.';
            } catch (_) {
                this.checkoutError = 'Looks like we lost the connection. Try again in a moment.';
            } finally {
                this.checkingOut = false;
            }
        },
        async submit() {
            this.formError = null;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.email)) {
                this.formError = 'Please enter a valid email address.';
                return;
            }
            this.submitting = true;
            try {
                await fetchJson('/api/support/interest', {
                    method: 'POST',
                    body: JSON.stringify({ email: this.email, tier: this.selectedTier, message: this.message }),
                });
                this.submitted = true;
                setTimeout(() => this.closeModal(), 2000);
            } catch {
                this.formError = 'Something went wrong, please try again.';
            } finally {
                this.submitting = false;
            }
        },
    },
};
</script>
