<style lang="scss">
@import "../css/_globals";

.lpUpgradeLock {
    align-items: center;
    background: $color-surface;
    border: 1px dashed $color-border;
    border-radius: $radius-md;
    color: $color-text-muted;
    cursor: pointer;
    display: flex;
    font-size: $fontSize-sm;
    gap: 8px;
    padding: 10px 14px;
    transition: border-color $transitionDurationFast ease, color $transitionDurationFast ease;
    width: 100%;

    &:hover {
        border-color: $color-accent;
        color: $color-accent;
    }
}

.lpUpgradeLockIcon {
    flex-shrink: 0;
    font-size: 14px;
    opacity: 0.7;
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
            <span class="lpUpgradeLockIcon">🔒</span>
            <span>{{ inlineText }}</span>
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
                            <textarea v-model="message" placeholder="Tell us a bit about how you use LighterPack" rows="3" />
                        </div>
                        <p v-if="formError" class="lpUpgradeError">{{ formError }}</p>
                        <button class="lpButton" :disabled="submitting" @click="submit">
                            {{ submitting ? 'Sending…' : 'Send' }}
                        </button>
                    </div>

                    <a class="lpHref" href="/about" target="_blank">Pack light, give light →</a>
                </div>

                <div v-else class="lpUpgradeConfirm">
                    Thanks! We'll be in touch soon.
                </div>
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
    'Managed backups and restore',
];

const GUIDE_BENEFITS = [
    'Everything in Trail',
    'Full public profile (bio, gear philosophy, links)',
    'Insights: views, copies, top lists',
    'Affiliate links and promo codes per item',
    'Automatic affiliate disclosure',
];

const INLINE_TEXTS = {
    publicProfile: 'Trail — Share your gear identity',
    profileCustomization: 'Trail — Personalize your profile',
    managedBackups: 'Trail — Keep your data safe',
    creatorInsights: "Guide — See who's reading your lists",
    creatorLinks: 'Guide — Add your affiliate links',
    promoCode: 'Guide — Add a promo code',
};

const TAGLINES = {
    trail: 'A small contribution keeps LighterPack independent and open source. In return, you get a public profile to share your gear identity with the community.',
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
