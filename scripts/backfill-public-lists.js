const db = require('../server/db.js');
const {
    buildPublicListProjection,
} = require('../server/public-list-projections.js');

function isDiscoverableVisibility(visibility) {
    return visibility === 'discoverable' || visibility === 'indexable';
}

async function upsertLegacyStats(externalId, insights) {
    if (!externalId || !insights) return;
    const viewCount = Number(insights.listViews && insights.listViews[externalId]) || 0;
    const copyCount = Number(insights.listCopies && insights.listCopies[externalId]) || 0;
    const gearClicks = insights.gearClicks || {};
    const promoClicks = insights.promoClicks || {};
    const set = {};

    if (viewCount) set.viewCount = viewCount;
    if (copyCount) set.copyCount = copyCount;
    for (const [itemId, count] of Object.entries(gearClicks)) {
        if (Number(count)) set[`gearClicks.${itemId}`] = Number(count);
    }
    for (const [itemId, count] of Object.entries(promoClicks)) {
        if (Number(count)) set[`promoClicks.${itemId}`] = Number(count);
    }

    if (!Object.keys(set).length) return;

    await db.publicListStats.updateOne(
        { externalId },
        {
            $max: set,
            $set: { updatedAt: new Date() },
            $setOnInsert: { externalId, createdAt: new Date() },
        },
        { upsert: true },
    );
}

async function backfillLegacyViewers(externalId, insights) {
    const viewers = insights && insights.listViewers && Array.isArray(insights.listViewers[externalId])
        ? insights.listViewers[externalId]
        : [];
    for (const viewerKey of viewers) {
        try {
            await db.publicListViewers.save({
                externalId,
                viewerKey,
                createdAt: new Date(),
            });
        } catch (err) {
            if (!err || err.code !== 11000) throw err;
        }
    }
}

async function run() {
    await db.ready;
    await db.ensureIndexes();

    const users = await db.users.findMany({});
    let usersProcessed = 0;
    let listsProjected = 0;
    const activeExternalIds = [];

    for (const user of users) {
        usersProcessed++;
        const library = user.library || {};
        const lists = Array.isArray(library.lists) ? library.lists : [];
        const insights = library.insights || {};

        for (const list of lists) {
            if (!list.externalId) continue;

            if (!isDiscoverableVisibility(list.visibility)) {
                await db.publicLists.deleteOne({ externalId: list.externalId });
                continue;
            }

            await upsertLegacyStats(list.externalId, insights);
            await backfillLegacyViewers(list.externalId, insights);

            const stats = await db.publicListStats.findOne({ externalId: list.externalId }) || {};
            const projection = buildPublicListProjection(user, list, stats);
            await db.publicLists.updateOne(
                { externalId: list.externalId },
                { $set: projection },
                { upsert: true },
            );
            activeExternalIds.push(list.externalId);
            listsProjected++;
        }
    }

    await db.publicLists.deleteMany({ externalId: { $nin: activeExternalIds } });

    console.log(`Backfilled ${listsProjected} public lists from ${usersProcessed} users.`);
}

run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
