// The numbers of the moderation "Chiffres" panel. Read-only: it only counts. A new account is
// dated from its MongoDB id (which holds its creation time), so no date field had to be added.
const { ObjectId } = require('mongodb');

const db = require('./db.js');

const DAY_MS = 24 * 60 * 60 * 1000;
const PAID_PLANS = ['supporter', 'creator'];

function idSince(now, days) {
    return ObjectId.createFromTime(Math.floor((now.getTime() - days * DAY_MS) / 1000));
}

// One count per paid plan, answered as { supporter, creator }.
async function perPaidPlan(count) {
    const values = await Promise.all(PAID_PLANS.map(count));
    return { supporter: values[0], creator: values[1] };
}

async function collectStats(now = new Date()) {
    const planOf = (plan) => ({ 'library.entitlements.plan': plan });
    // Only Stripe subscriptions have a rhythm and a status that ZenPak follows; a plan from Ko-fi or
    // offered by a moderator does not.
    const stripe = (plan, extra) => ({ ...planOf(plan), 'billing.provider': 'stripe', ...extra });

    const [
        total, last7Days, last30Days, verified, banned,
        supporter, creator, offered,
        shareable, discoverable, indexable, featured,
        totals, pendingReports,
        monthly, yearly, new7, new30,
        statusActive, statusTrialing, statusPastDue, statusCanceled, endingAtPeriodEnd,
    ] = await Promise.all([
        db.users.count({}),
        db.users.count({ _id: { $gte: idSince(now, 7) } }),
        db.users.count({ _id: { $gte: idSince(now, 30) } }),
        db.users.count({ emailVerified: true }),
        db.users.count({ banned: true }),
        db.users.count(planOf('supporter')),
        db.users.count(planOf('creator')),
        db.users.count({ 'billing.provider': 'comp', 'billing.status': 'active' }),
        db.publicLists.count({ visibility: 'shareable' }),
        db.publicLists.count({ visibility: 'discoverable' }),
        db.publicLists.count({ visibility: 'indexable' }),
        db.publicLists.count({ featured: true }),
        db.publicListStats.aggregate([{
            $group: {
                _id: null, views: { $sum: '$viewCount' }, copies: { $sum: '$copyCount' }, csvDownloads: { $sum: '$csvDownloadCount' },
            },
        }]),
        db.reports.count({ status: 'pending' }),
        perPaidPlan((plan) => db.users.count(stripe(plan, { 'billing.interval': 'month' }))),
        perPaidPlan((plan) => db.users.count(stripe(plan, { 'billing.interval': 'year' }))),
        perPaidPlan((plan) => db.users.count({ ...planOf(plan), _id: { $gte: idSince(now, 7) } })),
        perPaidPlan((plan) => db.users.count({ ...planOf(plan), _id: { $gte: idSince(now, 30) } })),
        db.users.count({ 'billing.provider': 'stripe', 'billing.status': 'active' }),
        db.users.count({ 'billing.provider': 'stripe', 'billing.status': 'trialing' }),
        db.users.count({ 'billing.provider': 'stripe', 'billing.status': 'past_due' }),
        db.users.count({ 'billing.provider': 'stripe', 'billing.status': 'canceled' }),
        db.users.count({ 'billing.provider': 'stripe', 'billing.cancelAtPeriodEnd': true }),
    ]);

    const sums = totals[0] || {};
    return {
        users: {
            total, last7Days, last30Days, verified, banned,
        },
        plans: {
            free: Math.max(total - supporter - creator, 0), supporter, creator, offered,
        },
        // Paying: a paid plan that nobody offered. Against the accounts whose e-mail is verified.
        conversion: {
            paying: Math.max(supporter + creator - offered, 0), verified,
        },
        subscriptions: { monthly, yearly },
        newByPlan: { last7Days: new7, last30Days: new30 },
        billing: {
            active: statusActive,
            trialing: statusTrialing,
            pastDue: statusPastDue,
            canceled: statusCanceled,
            endingAtPeriodEnd,
        },
        lists: {
            shareable, discoverable, indexable, featured,
        },
        activity: {
            views: sums.views || 0, copies: sums.copies || 0, csvDownloads: sums.csvDownloads || 0, pendingReports,
        },
    };
}

module.exports = { collectStats };
