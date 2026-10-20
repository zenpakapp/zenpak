// The numbers of the moderation "Chiffres" panel. Read-only: it only counts. A new account is
// dated from its MongoDB id (which holds its creation time), so no date field had to be added.
const { ObjectId } = require('mongodb');

const db = require('./db.js');

const DAY_MS = 24 * 60 * 60 * 1000;

function idSince(now, days) {
    return ObjectId.createFromTime(Math.floor((now.getTime() - days * DAY_MS) / 1000));
}

async function collectStats(now = new Date()) {
    const [
        total, last7Days, last30Days, verified, banned,
        supporter, creator, offered,
        shareable, discoverable, indexable, featured,
        totals, pendingReports,
    ] = await Promise.all([
        db.users.count({}),
        db.users.count({ _id: { $gte: idSince(now, 7) } }),
        db.users.count({ _id: { $gte: idSince(now, 30) } }),
        db.users.count({ emailVerified: true }),
        db.users.count({ banned: true }),
        db.users.count({ 'library.entitlements.plan': 'supporter' }),
        db.users.count({ 'library.entitlements.plan': 'creator' }),
        db.users.count({ 'billing.provider': 'comp', 'billing.status': 'active' }),
        db.publicLists.count({ visibility: 'shareable' }),
        db.publicLists.count({ visibility: 'discoverable' }),
        db.publicLists.count({ visibility: 'indexable' }),
        db.publicLists.count({ featured: true }),
        db.publicListStats.aggregate([{ $group: { _id: null, views: { $sum: '$viewCount' }, copies: { $sum: '$copyCount' } } }]),
        db.reports.count({ status: 'pending' }),
    ]);

    const sums = totals[0] || {};
    return {
        users: {
            total, last7Days, last30Days, verified, banned,
        },
        plans: {
            free: Math.max(total - supporter - creator, 0), supporter, creator, offered,
        },
        lists: {
            shareable, discoverable, indexable, featured,
        },
        activity: { views: sums.views || 0, copies: sums.copies || 0, pendingReports },
    };
}

module.exports = { collectStats };
