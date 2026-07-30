const config = require('config');
const nodemailer = require('nodemailer');

async function sendMailDev(mailOptions) {
    const transporter = nodemailer.createTransport({
        host: '127.0.0.1',
        port: config.get('mailpitSmtpPort') || 1025,
        secure: false,
        ignoreTLS: true,
    });
    await transporter.sendMail({
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
    });
    return { message: 'Queued (Mailpit dev)' };
}

function getResendEmailsUrl() {
    const baseUrl = (config.get('resendBaseURL') || 'https://api.resend.com').replace(/\/+$/, '');
    return `${baseUrl}/emails`;
}

function getResendAuthorization() {
    const apiKey = config.get('resendAPIKey');

    if (!apiKey) {
        throw new Error('Resend API key is not configured');
    }

    return `Bearer ${apiKey}`;
}

function mailOptionsToResendPayload(mailOptions) {
    const payload = {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
    };

    if (mailOptions.html) payload.html = mailOptions.html;
    if (mailOptions.text) payload.text = mailOptions.text;
    if (mailOptions.cc) payload.cc = mailOptions.cc;
    if (mailOptions.bcc) payload.bcc = mailOptions.bcc;
    if (mailOptions.reply_to) payload.reply_to = mailOptions.reply_to;
    if (mailOptions['h:Reply-To']) payload.reply_to = mailOptions['h:Reply-To'];

    return payload;
}

async function sendResend(mailOptions) {
    const response = await fetch(getResendEmailsUrl(), {
        method: 'POST',
        headers: {
            Authorization: getResendAuthorization(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(mailOptionsToResendPayload(mailOptions)),
    });
    const responseText = await response.text();

    let payload = {};
    if (responseText) {
        try {
            payload = JSON.parse(responseText);
        } catch (error) {
            payload = { message: responseText };
        }
    }

    if (!response.ok) {
        const message = payload.message || (payload.error && payload.error.message) || response.statusText || 'Resend request failed';
        const resendError = new Error(message);
        resendError.status = response.status;
        resendError.payload = payload;
        throw resendError;
    }

    return payload;
}

async function sendMail(mailOptions) {
    if (config.get('environment') === 'development') {
        return sendMailDev(mailOptions);
    }

    return sendResend(mailOptions);
}

module.exports = {
    mailOptionsToResendPayload,
    sendMail,
    sendResend,
};
