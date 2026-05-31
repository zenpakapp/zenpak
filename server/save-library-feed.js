// server/save-library-feed.js
// Visibility-change detection logic for saveLibrary.
// Extracted so it can be unit-tested without an HTTP context.

'use strict';

const { emitFeedEvent } = require('./feed-events.js');
const { isPublicVisibility } = require('../client/services/public-visibility.js');

/**
 * Inspect old/new list arrays and emit feed events for every visibility change.
 *
 * @param {string|ObjectId} userId
 * @param {Array} oldLists  — lists from user.library before the save
 * @param {Array} newLists  — lists from the incoming library payload
 * @returns {Promise<void>}
 */
async function detectVisibilityChanges(userId, oldLists, newLists) {
    const oldVisibilityMap = Object.fromEntries(
        (oldLists || []).map((l) => [String(l.id), l.visibility]),
    );

    for (const newList of newLists || []) {
        const key = String(newList.id);
        const isNew = !(key in oldVisibilityMap);
        const oldVisibility = oldVisibilityMap[key];

        const wasPublic = isPublicVisibility(oldVisibility);
        const isNowPublic = isPublicVisibility(newList.visibility);

        if (!wasPublic && isNowPublic) {
            await emitFeedEvent(userId, isNew ? 'list.published' : 'list.made-public', newList.id)
                .catch(() => {});
        } else if (wasPublic && isNowPublic) {
            const oldList = (oldLists || []).find((l) => String(l.id) === key);
            if (oldList && oldList.name !== newList.name) {
                await emitFeedEvent(userId, 'list.updated', newList.id).catch(() => {});
            }
        }
    }
}

module.exports = { detectVisibilityChanges };
