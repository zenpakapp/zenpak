<style lang="scss">
@import "../css/_upgrade-prompt";
</style>

<template>
    <div>
        <div v-if="mode === 'inline'" class="lpUpgradeLock" @click="showModal = true">
            <span class="lpUpgradeLockText">{{ inlineText }}</span>
            <span class="lpUpgradeLockCta">{{ $t('guide.upgrade.inlineTextDefault', { tier: tierLabel }) }} →</span>
        </div>

        <modal :shown="showModal" @hide="closeModal">
            <div class="lpUpgradeModal">
                <div class="lpModalHeader">
                    <div>
                        <div class="lpUpgradeTier">{{ tierLabel }}</div>
                        <h2>{{ $t('guide.upgrade.supportProject') }}</h2>
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
                        >{{ $t('guide.upgrade.monthly') }}</button>
                        <button
                            class="lpUpgradeIntervalBtn"
                            :class="{ active: interval === 'year' }"
                            @click="interval = 'year'"
                        >{{ $t('guide.upgrade.annual') }} <span class="lpUpgradeIntervalSave">{{ $t('guide.upgrade.annualSave') }}</span></button>
                    </div>
                    <div class="lpUpgradePrice">
                        {{ priceDisplay }}<span>{{ priceUnit }}</span>
                    </div>
                    <p v-if="checkoutError" class="lpUpgradeError">{{ checkoutError }}</p>
                    <button class="lpButton" :disabled="checkingOut" @click="checkout">
                        {{ checkingOut ? $t('guide.upgrade.redirecting') : $t('guide.upgrade.becomeButton', { tier: tierLabel }) }}
                    </button>
                </div>

                <template v-else>
                    <div v-if="!submitted" class="lpUpgradeActions">
                        <button class="lpButton" @click="showForm = !showForm">
                            {{ showForm ? $t('guide.upgrade.cancel') : $t('guide.upgrade.interested') }}
                        </button>

                        <div v-if="showForm" class="lpUpgradeInterestForm">
                            <div>
                                <label>{{ $t('guide.upgrade.yourEmail') }}</label>
                                <input v-model="email" type="email" :placeholder="$t('guide.upgrade.yourEmailPlaceholder')" />
                            </div>
                            <div>
                                <label>{{ $t('guide.upgrade.whichPlan') }}</label>
                                <select v-model="selectedTier">
                                    <option value="trail">Kin</option>
                                    <option value="guide">Wayfarer</option>
                                </select>
                            </div>
                            <div>
                                <label>{{ $t('guide.upgrade.message') }}</label>
                                <textarea v-model="message" :placeholder="$t('guide.upgrade.messagePlaceholder')" rows="3" />
                            </div>
                            <p v-if="formError" class="lpUpgradeError">{{ formError }}</p>
                            <button class="lpButton" :disabled="submitting" @click="submit">
                                {{ submitting ? $t('guide.upgrade.sending') : $t('guide.upgrade.send') }}
                            </button>
                        </div>
                    </div>

                    <div v-else class="lpUpgradeConfirm">
                        {{ $t('guide.upgrade.thankYou') }}
                    </div>
                </template>
            </div>
        </modal>
    </div>
</template>

<script>
import modal from './modal.vue';
import { fetchJson } from '../utils/utils.js';

const TRAIL_BENEFITS_KEYS = [
    'guide.upgrade.trailBenefit1',
    'guide.upgrade.trailBenefit2',
    'guide.upgrade.trailBenefit3',
];

const GUIDE_BENEFITS_KEYS = [
    'guide.upgrade.guideBenefit1',
    'guide.upgrade.guideBenefit2',
    'guide.upgrade.guideBenefit3',
    'guide.upgrade.guideBenefit4',
    'guide.upgrade.guideBenefit5',
    'guide.upgrade.guideBenefit6',
];

const INLINE_TEXTS_KEYS = {
    publicProfile: 'guide.upgrade.inlineTextPublicProfile',
    profileCustomization: 'guide.upgrade.inlineTextProfileCustomization',
    creatorInsights: 'guide.upgrade.inlineTextCreatorInsights',
    creatorLinks: 'guide.upgrade.inlineTextCreatorLinks',
    promoCode: 'guide.upgrade.inlineTextPromoCode',
};

const TAGLINES_KEYS = {
    trail: 'guide.upgrade.taglineTrail',
    guide: 'guide.upgrade.taglineGuide',
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
            const key = INLINE_TEXTS_KEYS[this.feature];
            return key ? this.$t(key) : this.$t('guide.upgrade.inlineTextDefault', { tier: this.tierLabel });
        },
        tagline() {
            const key = TAGLINES_KEYS[this.tier];
            return key ? this.$t(key) : '';
        },
        benefits() {
            const keys = this.tier === 'trail' ? TRAIL_BENEFITS_KEYS : GUIDE_BENEFITS_KEYS;
            return keys.map(key => this.$t(key));
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
                else this.checkoutError = data.message || this.$t('guide.upgrade.checkoutError');
            } catch (_) {
                this.checkoutError = this.$t('guide.upgrade.connectionError');
            } finally {
                this.checkingOut = false;
            }
        },
        async submit() {
            this.formError = null;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.email)) {
                this.formError = this.$t('guide.upgrade.formError');
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
