const { sendMail } = require('./email-provider.js');
const { createNotification } = require('./notifications.js');
const { logger } = require('./log.js');
const { DEFAULT_LANGUAGE, normalizeLanguage } = require('./user-language.js');
const { TEXTS } = require('./moderation-notice-texts.js');

function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;',
    }[c]));
}

function buildMail(user, kind, name) {
    const texts = TEXTS[normalizeLanguage(user.language) || DEFAULT_LANGUAGE];
    const values = { user: user.username, name: name || '' };
    const subject = fill(texts[kind].subject, values);
    const greeting = fill(texts.greeting, values);
    const body = fill(texts[kind].body, values);
    const text = `${greeting}\n\n${body}\n\n${texts.signature}`;
    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:40px;">
        <tr><td style="font-size:20px;font-weight:700;color:#1a1a1a;padding-bottom:16px;">${escapeHtml(subject)}</td></tr>
        <tr><td style="font-size:15px;color:#444;line-height:1.5;padding-bottom:24px;">${escapeHtml(greeting)}<br><br>${escapeHtml(body).replace(/\n/g, '<br>')}</td></tr>
        <tr><td style="font-size:13px;color:#aaa;">${escapeHtml(texts.signature)} · <a href="https://zenpak.app" style="color:#aaa;">zenpak.app</a></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    return { subject, text, html };
}

// A mail outage must never block a moderation action: it is logged and the action goes on.
async function sendNotice(user, kind, name) {
    if (!user.email) return;
    try {
        await sendMail({
            from: 'ZenPak <noreply@zenpak.app>',
            to: user.email,
            'h:Reply-To': 'ZenPak <support@zenpak.app>',
            ...buildMail(user, kind, name),
        });
    } catch (error) {
        logger.warn({
            message: 'moderation notice not sent', kind, username: user.username, error: error.message,
        });
    }
}

async function noticeListUnpublished(owner, list) {
    await createNotification({ userId: owner._id, type: 'moderation', listName: list.name });
    await sendNotice(owner, 'listUnpublished', list.name);
}

// A banned account cannot sign in, so it has no bell: email only.
function noticeAccountBanned(user) {
    return sendNotice(user, 'accountBanned');
}

function noticeAccountRestored(user) {
    return sendNotice(user, 'accountRestored');
}

module.exports = { noticeListUnpublished, noticeAccountBanned, noticeAccountRestored };
