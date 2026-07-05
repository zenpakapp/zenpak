const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('config');

const { logWithRequest } = require('./log.js');
const { sendMail } = require('./mailgun.js');
const { authenticateUser, verifyPassword, isModerator } = require('./auth.js');
const db = require('./db.js');
const dataTypes = require('../client/dataTypes.js');

const Library = dataTypes.Library;

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { errors: [{ message: 'Too many attempts. Try again in 15 minutes.' }] },
});

const forgotLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { errors: [{ message: 'Too many requests. Try again in 1 hour.' }] },
});

// one day in many years this can go away.
eval(`${fs.readFileSync(path.join(__dirname, './sha3.js'))}`);

router.post('/register', authLimiter, (req, res) => {
    const username = String(req.body.username).toLowerCase().trim();
    const password = String(req.body.password);
    let email = String(req.body.email);

    const errors = [];

    if (!username) {
        errors.push({ field: 'username', message: 'Please enter a username.' });
    }

    if (username && (username.length < 3 || username.length > 32)) {
        errors.push({ field: 'username', message: 'Please enter a username between 3 and 32 characters.' });
    }

    if (!email) {
        errors.push({ field: 'email', message: 'Please enter an email.' });
    }

    email = email.trim();

    if (!password) {
        errors.push({ field: 'password', message: 'Please enter a password.' });
    }

    if (password && (password.length < 5 || password.length > 60)) {
        errors.push({ field: 'password', message: 'Please enter a password between 5 and 60 characters.' });
    }

    if (errors.length) {
        return res.status(400).json({ errors });
    }

    logWithRequest(req, { message: 'Attempting to register', username });

    db.users.find({ username }, (err, users) => {
        if (err) {
            logWithRequest(req, { message: 'DB error on username lookup', username, error: err.message });
            return res.status(500).json({ errors: [{ message: 'An error occurred, please try again later.' }] });
        }
        if (users.length) {
            logWithRequest(req, { message: 'User exists', username });
            return res.status(400).json({ errors: [{ field: 'username', message: 'That username already exists, please pick a different username.' }] });
        }

        db.users.find({ email }, (err, users) => {
            if (err) {
                logWithRequest(req, { message: 'DB error on email lookup', email, error: err.message });
                return res.status(500).json({ errors: [{ message: 'An error occurred, please try again later.' }] });
            }
            if (users.length) {
                logWithRequest(req, { message: 'User email exists', email });
                return res.status(400).json({ errors: [{ field: 'email', message: 'A user with that email already exists.' }] });
            }

            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(password, salt, (err, hash) => {
                    crypto.randomBytes(48, (ex, buf) => {
                        const token = buf.toString('hex');
                        let library;
                        if (req.body.library) {
                            try {
                                library = JSON.parse(req.body.library);
                            } catch (e) {
                                logWithRequest(req, { message: 'Library parsing issue', username });
                                return res.status(400).json({ errors: [{ message: 'Unable to parse your library. Contact support.' }] });
                            }
                        } else {
                            library = new Library().save();
                        }

                        const emailVerifyToken = crypto.randomBytes(32).toString('hex');
                        const newUser = {
                            username,
                            password: hash,
                            email,
                            token,
                            library,
                            syncToken: 0,
                            emailVerified: false,
                            emailVerifyToken,
                        };
                        logWithRequest(req, { message: 'Saving new user', username });
                        db.users.save(newUser);

                        const deployUrl = (config.has('deployUrl') && config.get('deployUrl')) || 'https://zenpak.app';
                        const verifyUrl = `${deployUrl}/verify-email?token=${emailVerifyToken}`;
                        const textBody = `Almost ready, ${username}!\n\nVerify your email to share your lists with the world:\n\n${verifyUrl}\n\n— The ZenPak team`;
                        const htmlBody = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr><td style="font-size:22px;font-weight:700;color:#1a1a1a;padding-bottom:8px;">Almost ready, ${username}!</td></tr>
        <tr><td style="font-size:15px;color:#444;padding-bottom:24px;">Verify your email to share your lists with the world.</td></tr>
        <tr><td align="center" style="padding-bottom:28px;">
          <a href="${verifyUrl}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:6px;">Verify my email →</a>
        </td></tr>
        <tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;padding-top:20px;">Didn't create a ZenPak account? Ignore this email.</td></tr>
        <tr><td style="font-size:13px;color:#aaa;padding-top:20px;">— The ZenPak team · <a href="https://zenpak.app" style="color:#aaa;">zenpak.app</a></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
                        sendMail({
                            from: 'ZenPak <noreply@zenpak.app>',
                            to: email,
                            'h:Reply-To': 'ZenPak <support@zenpak.app>',
                            subject: 'Verify your ZenPak email',
                            text: textBody,
                            html: htmlBody,
                        }).catch((e) => logWithRequest(req, e));

                        const out = { username, library: JSON.stringify(newUser.library), syncToken: 0, emailVerified: false };
                        res.cookie('lp', token, { path: '/', maxAge: 365 * 24 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
                        return res.status(200).json(out);
                    });
                });
            });
        });
    });
});

router.post('/signin', authLimiter, (req, res) => {
    authenticateUser(req, res, returnLibrary);
});

function returnLibrary(req, res, user) {
    logWithRequest(req, { message: 'signed in', username: user.username });
    if (!user.syncToken) {
        user.syncToken = 0;
        db.users.updateOne({ _id: user._id }, { $set: { syncToken: 0 } });
    }
    return res.json({ username: user.username, library: JSON.stringify(user.library), syncToken: user.syncToken, emailVerified: !!user.emailVerified });
}

router.post('/forgotPassword', forgotLimiter, (req, res) => {
    logWithRequest(req);
    const username = String(req.body.username).toLowerCase().trim();
    if (!username || username.length < 1 || username.length > 32) {
        return res.status(400).json({ errors: [{ message: 'Please enter a username.' }] });
    }

    db.users.findOne({ username }, (err, user) => {
        if (err) return res.status(500).json({ errors: [{ message: 'An error occurred, please try again.' }] });
        if (!user) return res.status(400).json({ errors: [{ message: 'No account found with that username.' }] });

        const cooldown = 15 * 60 * 1000;
        if (user.resetTokenExpiry && user.resetTokenExpiry - Date.now() > (60 * 60 * 1000 - cooldown)) {
            return res.status(200).json({ message: 'A reset link has been sent to your email.' });
        }

        const token = require('crypto').randomBytes(32).toString('hex');
        user.resetToken = token;
        user.resetTokenExpiry = Date.now() + 60 * 60 * 1000;

        db.users.save(user, (saveErr) => {
            if (saveErr) return res.status(500).json({ message: 'An error occurred' });

            const deployUrl = (config.has('deployUrl') && config.get('deployUrl')) || 'https://zenpak.app';
            const resetUrl = `${deployUrl}/reset-password?token=${token}`;

            const textBody = `Hi ${username},\n\nEven the best hikers lose the trail sometimes. Here's your link to find your way back — it expires in 1 hour:\n\n${resetUrl}\n\nDidn't request this? Just ignore this email — your password won't change.\n\n— The ZenPak team`;

            const htmlBody = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr><td style="font-size:22px;font-weight:700;color:#1a1a1a;padding-bottom:8px;">Lost on the trail?</td></tr>
        <tr><td style="font-size:15px;color:#444;padding-bottom:24px;">Hey <strong>${username}</strong>,<br><br>Even the best hikers lose the trail sometimes. Click below to find your way back — the link expires in <strong>1 hour</strong>.</td></tr>
        <tr><td align="center" style="padding-bottom:28px;">
          <a href="${resetUrl}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:6px;">Get back on track →</a>
        </td></tr>
        <tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;padding-top:20px;">Didn't request this? Just ignore this email — your password won't change.<br><br>Or copy this link: <a href="${resetUrl}" style="color:#2d6a4f;word-break:break-all;">${resetUrl}</a></td></tr>
        <tr><td style="font-size:13px;color:#aaa;padding-top:20px;">— The ZenPak team · <a href="https://zenpak.app" style="color:#aaa;">zenpak.app</a></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

            sendMail({
                from: 'ZenPak <noreply@zenpak.app>',
                to: user.email,
                'h:Reply-To': 'ZenPak <support@zenpak.app>',
                subject: 'Reset your ZenPak password',
                text: textBody,
                html: htmlBody,
            }).catch((e) => logWithRequest(req, e));

            return res.status(200).json({ message: 'A reset link has been sent to your email.' });
        });
    });
});

router.post('/resetPassword', (req, res) => {
    logWithRequest(req);
    const { token, password } = req.body;

    if (!token || !password || password.length < 6) {
        return res.status(400).json({ errors: [{ message: 'Password must be at least 6 characters.' }] });
    }

    db.users.findOne({ resetToken: token }, (err, user) => {
        if (err || !user) {
            return res.status(400).json({ errors: [{ message: 'Invalid or expired reset link.' }] });
        }
        if (!user.resetTokenExpiry || Date.now() > user.resetTokenExpiry) {
            return res.status(400).json({ errors: [{ message: 'Reset link has expired. Please request a new one.' }] });
        }

        bcrypt.genSalt(10, (saltErr, salt) => {
            bcrypt.hash(password, salt, (hashErr, hash) => {
                user.password = hash;
                user.resetToken = null;
                user.resetTokenExpiry = null;
                db.users.save(user, (saveErr) => {
                    if (saveErr) return res.status(500).json({ message: 'An error occurred' });
                    logWithRequest(req, { message: 'Password reset for user', username: user.username });
                    return res.status(200).json({ message: 'Password updated successfully.' });
                });
            });
        });
    });
});

router.post('/forgotUsername', forgotLimiter, (req, res) => {
    logWithRequest(req);
    const email = String(req.body.email).toLowerCase().trim();
    if (!email || email.length < 1) {
        logWithRequest(req, { message: 'Bad forgot username', email });
        return res.status(400).json({ errors: [{ message: 'Please enter a valid email.' }] });
    }

    db.users.findOne({ email }, (err, user) => {
        if (err) {
            logWithRequest(req, { message: 'Forgot email lookup error', email });
            return res.status(500).json({ message: 'An error occurred' });
        } if (!user) {
            logWithRequest(req, { message: 'Forgot email for unknown user', email });
            return res.status(200).json({ email });
        }
        const cooldown = 15 * 60 * 1000;
        if (user.forgotUsernameSentAt && Date.now() - user.forgotUsernameSentAt < cooldown) {
            return res.status(200).json({ email });
        }

        user.forgotUsernameSentAt = Date.now();
        db.users.save(user, () => {});

        const username = user.username;

        const signinUrl = 'https://zenpak.app/welcome';

        const textBody = `Hi,\n\nFound it. Here's the trail marker you were looking for:\n\n  ${username}\n\nHead back: ${signinUrl}\n\nIf you need help, reply to this email.\n\n— The ZenPak team`;

        const htmlBody = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr><td style="font-size:22px;font-weight:700;color:#1a1a1a;padding-bottom:8px;">Found your trail marker</td></tr>
        <tr><td style="font-size:15px;color:#444;padding-bottom:24px;">Here's the username tied to this email:</td></tr>
        <tr><td align="center" style="padding-bottom:28px;">
          <div style="display:inline-block;background:#f0f4f1;border:1px solid #d0e0d8;border-radius:6px;padding:14px 32px;font-size:20px;font-weight:700;color:#2d6a4f;letter-spacing:.5px;">${username}</div>
        </td></tr>
        <tr><td align="center" style="padding-bottom:28px;">
          <a href="${signinUrl}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:6px;">Back to the trail →</a>
        </td></tr>
        <tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;padding-top:20px;">Didn't request this? Just ignore this email.</td></tr>
        <tr><td style="font-size:13px;color:#aaa;padding-top:20px;">— The ZenPak team · <a href="https://zenpak.app" style="color:#aaa;">zenpak.app</a></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const mailOptions = {
            from: 'ZenPak <noreply@zenpak.app>',
            to: email,
            'h:Reply-To': 'ZenPak <support@zenpak.app>',
            subject: 'Your ZenPak username',
            text: textBody,
            html: htmlBody,
        };

        logWithRequest(req, { message: 'Attempting to send username', email, username });
        sendMail(mailOptions).then((response) => {
            const out = { email };
            logWithRequest(req, { message: 'Message sent', response: response.message });
            logWithRequest(req, { message: 'sent username message for user', username, email });
            return res.status(200).json(out);
        }).catch((error) => {
            logWithRequest(req, error);
            return res.status(500).json({ message: 'An error occurred' });
        });
    });
});

router.get('/api/auth/me', (req, res) => {
    authenticateUser(req, res, (req, res, user) => {
        return res.json({ isModerator: isModerator(user.username) });
    });
});

router.get('/verify-email', (req, res, next) => {
    const { token } = req.query;
    if (!token) return next();

    db.users.findOne({ emailVerifyToken: token }, (err, user) => {
        if (err || !user) return res.redirect('/verify-email?error=1');
        user.emailVerified = true;
        user.emailVerifyToken = undefined;
        db.users.save(user);
        return res.redirect('/verify-email?success=1');
    });
});

router.post('/resendVerification', (req, res) => {
    authenticateUser(req, res, (req, res, user) => {
        if (user.emailVerified) {
            return res.status(200).json({ alreadyVerified: true, message: 'Your email is already verified.' });
        }

        const cooldown = 5 * 60 * 1000;
        if (user.verifyEmailSentAt && Date.now() - user.verifyEmailSentAt < cooldown) {
            return res.status(429).json({ errors: [{ message: 'Please wait 5 minutes before requesting another verification email.' }] });
        }

        const emailVerifyToken = crypto.randomBytes(32).toString('hex');
        user.emailVerifyToken = emailVerifyToken;
        user.verifyEmailSentAt = Date.now();
        db.users.save(user);

        const deployUrl = (config.has('deployUrl') && config.get('deployUrl')) || 'https://zenpak.app';
        const verifyUrl = `${deployUrl}/verify-email?token=${emailVerifyToken}`;
        const textBody = `Hi ${user.username},\n\nVerify your ZenPak email:\n\n${verifyUrl}\n\n— The ZenPak team`;
        const htmlBody = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr><td style="font-size:22px;font-weight:700;color:#1a1a1a;padding-bottom:8px;">Verify your email</td></tr>
        <tr><td style="font-size:15px;color:#444;padding-bottom:24px;">One click and your ZenPak pack is ready to share with the world.</td></tr>
        <tr><td align="center" style="padding-bottom:28px;">
          <a href="${verifyUrl}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:6px;">Verify my email →</a>
        </td></tr>
        <tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;padding-top:20px;">Didn't request this? Ignore it.</td></tr>
        <tr><td style="font-size:13px;color:#aaa;padding-top:20px;">— The ZenPak team · <a href="https://zenpak.app" style="color:#aaa;">zenpak.app</a></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
        sendMail({
            from: 'ZenPak <noreply@zenpak.app>',
            to: user.email,
            'h:Reply-To': 'ZenPak <support@zenpak.app>',
            subject: 'Verify your ZenPak email',
            text: textBody,
            html: htmlBody,
        }).catch((e) => logWithRequest(req, e));

        return res.status(200).json({ message: 'Verification email sent.' });
    });
});

module.exports = router;
