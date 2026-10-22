/**
 * Unit test: the member is told when a moderator takes their list down or bans their account,
 * and when the account is reinstated. Email in the language of the account, a bell alert for a list.
 * A failure to notify never blocks a moderation action.
 * Run with: node test/unit-moderation-notices.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    kofiWebhookToken: '',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const mails = [];
const alerts = [];
let mailFails = false;
stubServerModule('email-provider.js', {
    sendMail(options) {
        if (mailFails) return Promise.reject(new Error('mail down'));
        mails.push(options);
        return Promise.resolve({});
    },
});
stubServerModule('notifications.js', {
    createNotification(note) { alerts.push(note); return Promise.resolve(); },
});
stubServerModule('log.js', { logger: { warn() {}, error() {} }, logWithRequest() {} });

const notices = require('../server/moderation-notices.js');

const owner = {
    _id: 'u1', username: 'alice', email: 'alice@example.com', language: 'fr',
};

(async () => {
    // A taken-down list: an email in the language of the account, and an alert that names the list.
    await notices.noticeListUnpublished(owner, { name: 'Ma liste' });
    assert.strictEqual(mails.length, 1);
    assert.strictEqual(mails[0].to, 'alice@example.com');
    assert.strictEqual(mails[0]['h:Reply-To'], 'ZenPak <support@zenpak.app>');
    assert.ok(mails[0].from.includes('noreply@zenpak.app'));
    assert.ok(mails[0].text.includes('Ma liste'), 'names the list');
    assert.ok(/retiré/i.test(mails[0].subject + mails[0].text), 'written in French');
    assert.ok(mails[0].text.includes('support@zenpak.app') || mails[0].text.toLowerCase().includes('répondez'), 'tells how to appeal');
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0].type, 'moderation');
    assert.strictEqual(alerts[0].userId, 'u1');
    assert.strictEqual(alerts[0].listName, 'Ma liste');

    // Without a stored language the email is in English.
    mails.length = 0;
    await notices.noticeListUnpublished({ ...owner, language: undefined }, { name: 'My list' });
    assert.ok(/removed/i.test(mails[0].subject + mails[0].text), 'English by default');

    // Each of the four languages has its own wording for every notice.
    for (const language of ['en', 'fr', 'de', 'es']) {
        const subjects = new Set();
        for (const send of [notices.noticeListUnpublished, notices.noticeAccountBanned, notices.noticeAccountRestored]) {
            mails.length = 0;
            await send({ ...owner, language }, { name: 'X' });
            assert.strictEqual(mails.length, 1, `${language} sends one email`);
            assert.ok(mails[0].subject && mails[0].text && mails[0].html, `${language} has subject, text and html`);
            subjects.add(mails[0].subject);
        }
        assert.strictEqual(subjects.size, 3, `${language} has three different subjects`);
    }

    // A ban and its lifting are email only: a banned account cannot open the bell.
    alerts.length = 0;
    mails.length = 0;
    await notices.noticeAccountBanned(owner);
    await notices.noticeAccountRestored(owner);
    assert.strictEqual(mails.length, 2);
    assert.strictEqual(alerts.length, 0);

    // The ban email gives a way to ask for a review and does not name who reported.
    await notices.noticeAccountBanned(owner);
    assert.ok(mails[mails.length - 1].text.includes('support@zenpak.app') || /répondez/i.test(mails[mails.length - 1].text));

    // An account with no email still gets the alert and nothing breaks.
    mails.length = 0;
    alerts.length = 0;
    await notices.noticeListUnpublished({ _id: 'u2', username: 'bob', language: 'en' }, { name: 'L' });
    assert.strictEqual(mails.length, 0);
    assert.strictEqual(alerts.length, 1);

    // A mail outage is swallowed: the moderation action goes on.
    mailFails = true;
    await notices.noticeListUnpublished(owner, { name: 'L' });
    await notices.noticeAccountBanned(owner);
    await notices.noticeAccountRestored(owner);

    console.log('unit-moderation-notices OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
