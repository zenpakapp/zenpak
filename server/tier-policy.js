function normalizeTier(plan) {
    if (plan === 'creator') return 'guide';
    if (plan === 'supporter') return 'trail';
    return 'base';
}

module.exports = {
    normalizeTier,
};
