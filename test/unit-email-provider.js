const assert = require('assert');
const { mailOptionsToResendPayload } = require('../server/email-provider.js');

const payload = mailOptionsToResendPayload({
    from: 'ZenPak <noreply@zenpak.app>',
    to: 'user@example.com',
    subject: 'Verify your email',
    text: 'Text body',
    html: '<p>HTML body</p>',
    'h:Reply-To': 'ZenPak <support@zenpak.app>',
});

assert.deepStrictEqual(payload, {
    from: 'ZenPak <noreply@zenpak.app>',
    to: 'user@example.com',
    subject: 'Verify your email',
    text: 'Text body',
    html: '<p>HTML body</p>',
    reply_to: 'ZenPak <support@zenpak.app>',
});

console.log('email provider ok');
