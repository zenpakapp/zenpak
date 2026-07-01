<style lang="scss">
@import "../css/_globals";

.lpUpgradeLock {
    align-items: center;
    background: $color-surface;
    border: 1px dashed $color-border;
    border-radius: $radius-md;
    cursor: pointer;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding: 12px 16px;
    transition: border-color $transitionDurationFast ease;
    width: 100%;

    &:hover {
        border-color: $color-accent;

        .lpUpgradeLockCta {
            background: $color-accent;
            color: #fff;
        }
    }
}

.lpUpgradeLockText {
    color: $color-text-muted;
    font-size: $fontSize-sm;
}

.lpUpgradeLockCta {
    background: rgba(var(--color-accent-rgb), 0.1);
    border-radius: $radius-sm;
    color: $color-accent;
    flex-shrink: 0;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    padding: 4px 10px;
    transition: background $transitionDurationFast ease, color $transitionDurationFast ease;
    white-space: nowrap;
}

.lpUpgradeModal {
    .lpUpgradeTier {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        font-weight: 600;
        letter-spacing: 0.06em;
        margin-bottom: 4px;
        text-transform: uppercase;
    }

    .lpUpgradeTagline {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        margin-bottom: 20px;
    }

    .lpUpgradeBenefits {
        list-style: none;
        margin: 0 0 20px;
        padding: 0;

        li {
            align-items: flex-start;
            color: $color-text-muted;
            display: flex;
            font-size: $fontSize-sm;
            gap: 8px;
            padding: 4px 0;

            &::before {
                color: $color-accent;
                content: "✓";
                flex-shrink: 0;
                font-weight: 700;
            }
        }
    }

    .lpUpgradeActions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 4px;
    }

    .lpUpgradeInterestForm {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 16px;

        input, select, textarea {
            width: 100%;
        }
    }

    .lpUpgradeConfirm {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        padding: 8px 0;
        text-align: center;
    }

    .lpUpgradeError {
        color: var(--color-warning);
        font-size: $fontSize-sm;
    }
}
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
                                    <option value="trail">Trail</option>
                                    <option value="guide">Guide</option>
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
    'Trail badge on your public profile',
    'Public profile with avatar, bio, and links',
    'Improved public list presentation',
];

const GUIDE_BENEFITS = [
    'Public profile with avatar, bio, and links',
    'Guide badge on your profile and lists',
    'Library backup and restore',
    'Insights: views, copies, top lists',
    'Affiliate links and promo codes per item',
    'Automatic affiliate disclosure',
];

const INLINE_TEXTS = {
    publicProfile: 'Trail — Share your gear identity',
    profileCustomization: 'Trail — Personalize your profile',
    creatorInsights: "Your lists inspire others — see who reads them and earn from what you recommend.",
    creatorLinks: 'Guide — Add your affiliate links',
    promoCode: 'Guide — Add a promo code',
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
        };
    },
    computed: {
        tierLabel() {
            return this.tier === 'trail' ? 'Trail' : 'Guide';
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
            return this.$store.state.billing && this.$store.state.billing.stripeEnabled;
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
                    body: JSON.stringify({ plan: this.tier }),
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else this.checkoutError = 'Something went wrong — give it another try.';
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
