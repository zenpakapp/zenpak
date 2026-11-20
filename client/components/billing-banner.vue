<template>
    <div v-if="banner" :class="banner.cssClass">
        <template v-if="banner.kind === 'success'">
            ✓ {{ $t('dash.thankYouZenPak') }} {{ $t('dash.planNowActive', { plan: planLabel }) }}
        </template>
        <template v-else-if="banner.kind === 'managed'">
            ✓ {{ $t('dash.billingManaged') }}
        </template>
        <template v-else>
            {{ $t('dash.billingCancelled') }}
        </template>
    </div>
</template>

<script>
// The banner after coming back from the billing pages (?billing=success | cancel | managed).
// It reads the address once, when the dashboard opens, shows for BANNER_MS, then goes away.
import { BANNER_MS } from '../services/timings';
import { scrollBehavior } from '../utils/motion';
import { planLabel as planTierLabel } from '../services/tier-labels';

// What each return shows, and whether the plan must be read again (it may have just changed).
const BANNERS = {
    success: { cssClass: 'lpBillingSuccessBanner', refreshBilling: true },
    cancel: { cssClass: 'lpBillingCancelBanner', refreshBilling: false },
    managed: { cssClass: 'lpBillingSuccessBanner', refreshBilling: true },
};

export default {
    name: 'BillingBanner',
    data() {
        return { banner: null, timer: null };
    },
    computed: {
        planLabel() {
            const billing = this.$store.state.billing;
            return (billing && billing.plan) ? planTierLabel(billing.plan) : 'plan';
        },
    },
    created() {
        const kind = this.$route && this.$route.query.billing;
        if (!Object.prototype.hasOwnProperty.call(BANNERS, kind)) return;
        const { cssClass, refreshBilling } = BANNERS[kind];
        if (refreshBilling) this.$store.dispatch('refreshBilling');
        this.banner = { kind, cssClass };
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        this.timer = setTimeout(() => { this.banner = null; }, BANNER_MS);
    },
    beforeUnmount() {
        clearTimeout(this.timer);
    },
};
</script>
