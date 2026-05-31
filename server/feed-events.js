// server/feed-events.js
const { ObjectId } = require('mongodb');
const db = require('./db.js');

const VALID_TYPES = ['list.published', 'list.updated', 'list.made-public'];

async function emitFeedEvent(userId, type, listId) {
    if (!VALID_TYPES.includes(type)) {
        return;
    }
    await db.feedEvents.save({
        userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
        type,
        listId: typeof listId === 'string' ? new ObjectId(listId) : listId,
        createdAt: new Date(),
    });
}

async function getFeedForUser(followedIds, modes, cursor, limit = 20) {
    const allOnlyTypes = ['list.published', 'list.updated', 'list.made-public'];
    const newOnlyTypes = ['list.published', 'list.made-public'];

    const orClauses = followedIds.map((id) => {
        const mode = modes.get(id.toString()) || 'all';
        return {
            userId: id,
            type: { $in: mode === 'all' ? allOnlyTypes : newOnlyTypes },
        };
    });

    if (orClauses.length === 0) {
        return { events: [], nextCursor: null };
    }

    const query = { $or: orClauses };
    if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
    }

    const rows = await db.feedEvents.findSorted(query, { createdAt: -1 }, limit + 1);
    const hasMore = rows.length > limit;
    const events = rows.slice(0, limit);
    const nextCursor = hasMore ? events[events.length - 1].createdAt.toISOString() : null;

    return { events, nextCursor };
}

module.exports = { emitFeedEvent, getFeedForUser };
