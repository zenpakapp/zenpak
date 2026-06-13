// server/notifications.js
const { ObjectId } = require('mongodb');
const db = require('./db.js');

async function createNotification({ userId, type, actorUsername, listName }) {
    try {
        const user = await db.users.findOne({ _id: new ObjectId(userId) });
        if (!user) return;
        const prefs = user.notificationPrefs || { follow: true, copy: true };
        if (prefs[type] === false) return;

        await db.notifications.save({
            userId: new ObjectId(userId),
            type,
            actorUsername,
            listName: listName || null,
            read: false,
            createdAt: new Date(),
        });
    } catch {
        // notifications are non-critical — never throw
    }
}

module.exports = { createNotification };
