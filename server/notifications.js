// server/notifications.js
const { ObjectId } = require('mongodb');
const db = require('./db.js');

const FOLLOW_NOTIFICATION_DEDUPE_MS = 24 * 60 * 60 * 1000;

function notificationActorName(displayName, username) {
    const name = typeof displayName === 'string' ? displayName.trim() : '';
    return name || username;
}

async function createNotification({
    userId, type, actorUsername, actorDisplayName, actorTier, listName,
}) {
    try {
        const user = await db.users.findOne({ _id: new ObjectId(userId) });
        if (!user) return;
        const prefs = user.notificationPrefs || { follow: true, copy: true };
        if (prefs[type] === false) return;
        const now = new Date();

        if (type === 'follow' && actorUsername) {
            const recent = await db.notifications.findMany({
                userId: new ObjectId(userId),
                type,
                actorUsername,
            });
            const cutoff = now.getTime() - FOLLOW_NOTIFICATION_DEDUPE_MS;
            if (recent.some((n) => new Date(n.createdAt).getTime() >= cutoff)) return;
        }

        await db.notifications.save({
            userId: new ObjectId(userId),
            type,
            actorUsername,
            actorDisplayName: notificationActorName(actorDisplayName, actorUsername),
            actorTier: actorTier || null,
            listName: listName || null,
            read: false,
            createdAt: now,
        });
    } catch {
        // notifications are non-critical — never throw
    }
}

module.exports = { createNotification };
