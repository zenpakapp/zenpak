const TIER_LABELS = {
    base: 'Base',
    trail: 'Kin',
    guide: 'Wayfarer',
};

const PLAN_TIERS = {
    free: 'base',
    supporter: 'trail',
    creator: 'guide',
};

function tierFromPlan(plan) {
    return PLAN_TIERS[plan] || 'base';
}

function tierLabel(tier) {
    return TIER_LABELS[tier] || TIER_LABELS.base;
}

function planLabel(plan) {
    return tierLabel(tierFromPlan(plan));
}

module.exports = {
    tierFromPlan,
    tierLabel,
    planLabel,
};
