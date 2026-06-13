// server/notifications.js
const { ObjectId } = require('mongodb');
const db = require('./db.js');

async function createNotification({ userId, type, actorUsername, listName }) {
    try {
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
