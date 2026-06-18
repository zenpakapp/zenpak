const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const express = require('express');
const { readFile } = require('fs/promises');
const rateLimit = require('express-rate-limit');

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
const fs = require('fs');
const formidable = require('formidable');
const config = require('config');
const { logWithRequest } = require('./log.js');
const { sendMail } = require('./mailgun.js');
const { buildPublicProfile, buildPublicList } = require('./public-sharing.js');
const { detectVisibilityChanges } = require('./save-library-feed.js');

const { ObjectId } = require('mongodb');
const { authenticateUser, verifyPassword, isModerator } = require('./auth.js');

const db = require('./db.js');

const dataTypes = require('../client/dataTypes.js');

const Item = dataTypes.Item;
const Category = dataTypes.Category;
const List = dataTypes.List;
const Library = dataTypes.Library;

const EXTERNAL_ID_ALPHABET = '1234567890abcdefghijklmnopqrstuvwxyz';

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
        db.users.save(user);
    }
    return res.json({ username: user.username, library: JSON.stringify(user.library), syncToken: user.syncToken, emailVerified: !!user.emailVerified });
}

router.post('/saveLibrary', (req, res) => {
    authenticateUser(req, res, saveLibrary);
});

function saveLibrary(req, res, user) {
    if (typeof req.body.syncToken === 'undefined') {
        logWithRequest(req, { message: 'Missing syncToken', username: user.username });
        return res.status(400).send('Please refresh this page to upgrade to the latest version of LighterPack.');
    }
    if (!req.body.username || !req.body.data) {
        logWithRequest(req, { message: 'bad save: missing username or data', username: user.username });
        return res.status(400).json({ message: 'An error occurred while saving your data. Please refresh your browser and try again.' });
    }

    if (req.body.username != user.username) {
        logWithRequest(req, { message: 'bad save: bad username', initatedby: user.username, initiatedfor: req.body.username });
        return res.status(401).json({ message: 'An error occurred while saving your data. Please refresh your browser and login again.' });
    }

    if (req.body.syncToken != user.syncToken) {
        logWithRequest(req, { message: 'out of date syncToken', username: user.username });
        return res.status(400).json({ message: 'Your list is out of date - please refresh your browser.' });
    }

    let library;
    try {
        library = JSON.parse(req.body.data);
    } catch (e) {
        logWithRequest(req, { message: 'Library parsing issue', username: user.username });
        return res.status(400).json({ errors: [{ message: 'An error occurred while saving your data - unable to parse library. If this persists, please contact support.' }] });
    }

    const oldLists = (user.library && user.library.lists) || [];

    if (!user.emailVerified && library && library.lists) {
        const { isPublicVisibility } = require('../client/services/public-visibility.js');
        const storedVisibilityMap = {};
        oldLists.forEach((l) => { storedVisibilityMap[l.id] = l.visibility; });
        const escalatesVisibility = library.lists.some((l) => (
            isPublicVisibility(l.visibility) && !isPublicVisibility(storedVisibilityMap[l.id])
        ));
        if (escalatesVisibility) {
            return res.status(403).json({ errors: [{ message: 'Please verify your email before making lists public.' }] });
        }
    }

    const now = new Date();
    if (library && library.lists) {
        library.lists.forEach((list) => {
            if (!list.updatedAt) list.updatedAt = now;
        });
    }

    user.library = library;
    user.syncToken++;
    db.users.save(user, () => {
        logWithRequest(req, { message: 'saved library', username: user.username });

        const newLists = (library && library.lists) || [];
        detectVisibilityChanges(user._id, oldLists, newLists).catch(() => {});

        return res.status(200).json({ message: 'success', syncToken: user.syncToken });
    });
}

router.post('/externalId', (req, res) => {
    authenticateUser(req, res, externalId);
});

function externalId(req, res, user) {
    const id = Array.from(crypto.randomBytes(6), (byte) => EXTERNAL_ID_ALPHABET[byte % EXTERNAL_ID_ALPHABET.length]).join('');
    logWithRequest(req, { message: 'Id generated', id });

    db.users.find({ 'library.lists.externalId': id }, (err, users) => {
        if (err) {
            logWithRequest(req, { message: 'Id lookup error', id });
            res.status(500).send('An error occurred.');
            return;
        }

        if (!users.length) {
            if (typeof user.externalIds === 'undefined') user.externalIds = [id];
            else user.externalIds.push(id);

            db.users.save(user);
            logWithRequest(req, { message: 'Id saved', id, username: user.username });
            res.status(200).json({ externalId: id });
        } else {
            logWithRequest(req, { message: 'Id collision detected', id });
            externalId(req, res, user);
        }
    });
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

router.post('/account', (req, res) => {
    authenticateUser(req, res, account);
});

function account(req, res, user) {
    // TODO: check for duplicate emails

    logWithRequest(req, { message: 'Starting account changes', username: user.username });
    verifyPassword(user.username, String(req.body.currentPassword))
        .then((user) => {
            if (req.body.newPassword) {
                const newPassword = String(req.body.newPassword);
                const errors = [];

                if (newPassword.length < 5 || newPassword.length > 60) {
                    errors.push({ field: 'newPassword', message: 'Please enter a password between 5 and 60 characters.' });
                }

                if (errors.length) {
                    return res.status(400).json({ errors });
                }

                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newPassword, salt, (err, hash) => {
                        user.password = hash;
                        logWithRequest(req, { message: 'Changing PW', username: user.username });

                        if (req.body.newEmail) {
                            user.email = String(req.body.newEmail);
                            logWithRequest(req, { message: 'Changing Email', username: user.username });
                        }

                        db.users.save(user);
                        return res.status(200).json({ message: 'success' });
                    });
                });
            } else if (req.body.newEmail) {
                user.email = String(req.body.newEmail);
                logWithRequest(req, { message: 'Changing Email', username: user.username });
                db.users.save(user);
                return res.status(200).json({ message: 'success' });
            }
        })
        .catch((err) => {
            logWithRequest(req, { message: 'Account bad current password', username: user.username });
            res.status(400).json({ errors: [{ field: 'currentPassword', message: 'Your current password is incorrect.' }] });
        });
}

router.post('/delete-account', (req, res) => {
    authenticateUser(req, res, deleteAccount);
});

function deleteAccount(req, res, user) {
    logWithRequest(req, { message: 'Starting account delete', username: user.username });

    verifyPassword(user.username, String(req.body.password))
        .then((user) => {
            if (req.body.username !== user.username) {
                logWithRequest(req, { message: 'Bad account deletion - wrong user', requestedUsername: req.body.username, initiatedby: user.username });
                return Promise.reject(new Error('An error occurred, please try logging out and in again.'));
            }

            db.users.remove(user, true);

            logWithRequest(req, { message: 'Completed account delete', username: user.username });

            return res.status(200).json({ message: 'success' });
        })
        .catch((err) => {
            logWithRequest(req, { message: 'Bad account deletion - invalid password', username: req.body.username });
            res.status(400).json({ errors: [{ field: 'currentPassword', message: 'Your current password is incorrect.' }] });
        });
}

router.post('/imageUpload', (req, res) => {
    authenticateUser(req, res, imageUpload);
});

router.delete('/api/profile/avatar', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        try {
            if (!user.library) user.library = {};
            if (!user.library.publicProfile) user.library.publicProfile = {};
            user.library.publicProfile.avatarUrl = '';
            await db.users.save(user);
            return res.json({ ok: true });
        } catch (e) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

router.post('/api/profile/avatar', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        const form = formidable.formidable({ maxFiles: 1, maxFileSize: 2 * 1024 * 1024 });
        form.parse(req, async (err, fields, files) => {
            if (err) return res.status(500).json({ message: 'Upload error' });
            const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
            if (!imageFile || !imageFile.filepath) return res.status(400).json({ message: 'No file' });

            try {
                const data = await cloudinaryUpload(imageFile, {
                    folder: 'lighterpack/avatars',
                    transformation: 'w_200,h_200,c_fill,g_face,q_auto,f_auto',
                });

                if (!user.library) user.library = {};
                if (!user.library.publicProfile) user.library.publicProfile = {};
                user.library.publicProfile.avatarUrl = data.secure_url;
                await db.users.save(user);

                return res.json({ avatarUrl: data.secure_url });
            } catch (e) {
                return res.status(500).json({ message: 'An error occurred' });
            }
        });
    });
});

async function cloudinaryUpload(imageFile, { folder, transformation } = {}) {
    const cloudName = config.get('cloudinaryCloudName');
    const apiKey = config.get('cloudinaryApiKey');
    const apiSecret = config.get('cloudinaryApiSecret');
    const timestamp = Math.floor(Date.now() / 1000);

    // params sorted alphabetically before apiSecret
    const params = { folder, timestamp };
    if (transformation) params.transformation = transformation;
    const signatureStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + apiSecret;
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

    const imageBuffer = await readFile(imageFile.filepath);
    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer]), imageFile.originalFilename || 'image');
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);
    if (transformation) formData.append('transformation', transformation);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error?.message || 'Upload failed');
    return data;
}

function imageUpload(req, res, user) {
    const form = formidable.formidable({
        maxFiles: 1,
        maxFileSize: 5 * 1024 * 1024,
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            logWithRequest(req, 'form parse error');
            logWithRequest(req, err);
            return res.status(500).json({ message: 'An error occurred' });
        }

        const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
        if (!imageFile || !imageFile.filepath) {
            logWithRequest(req, 'No image in upload');
            return res.status(500).json({ message: 'An error occurred' });
        }

        try {
            const data = await cloudinaryUpload(imageFile, {
                folder: 'lighterpack',
                transformation: 'w_800,f_auto,q_auto',
            });
            return res.json({ data: { id: data.public_id, url: data.secure_url } });
        } catch (uploadError) {
            logWithRequest(req, 'cloudinary upload error');
            logWithRequest(req, uploadError);
            return res.status(500).json({ message: 'An error occurred.' });
        }
    });
}

const { scrapeGear } = require('./gear-scraper.js');

router.post('/scrapeGear', async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url required' });
    }
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return res.status(400).json({ error: 'invalid url' });
        }
        const data = await scrapeGear(url);
        return res.json(data);
    } catch (err) {
        return res.status(502).json({ error: err.message || 'fetch failed' });
    }
});

router.get('/api/public/profile/:username', async (req, res) => {
    const username = String(req.params.username || '').toLowerCase().trim();
    if (!username) {
        return res.status(404).json({ message: 'Profile not found' });
    }

    try {
        const user = await db.users.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        const payload = buildPublicProfile(user);
        if (!payload) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Gate enriched profile fields to Guide tier only
        const plan = (user.library && user.library.entitlements && user.library.entitlements.plan) || 'free';
        if (plan !== 'creator') {
            if (payload.profile) {
                payload.profile.bio = '';
                payload.profile.links = [];
                payload.profile.gearPhilosophy = [];
            }
        }

        const followerDocs = await db.follows.findMany({ followedId: new ObjectId(user._id) });
        const followingDocs = await db.follows.findMany({ followerId: new ObjectId(user._id) });
        payload.followerCount = followerDocs.length;
        payload.followingCount = followingDocs.length;

        return res.json(payload);
    } catch (err) {
        return res.status(500).json({ message: 'An error occurred' });
    }
});

router.get('/api/public/list/:externalId', (req, res) => {
    const externalId = String(req.params.externalId || '').trim();
    if (!externalId) {
        return res.status(404).json({ message: 'List not found' });
    }

    db.users.findOne({ 'library.lists.externalId': externalId }, (err, user) => {
        if (err) {
            logWithRequest(req, { message: 'Public list lookup error', externalId, error: err.message });
            return res.status(500).json({ message: 'An error occurred' });
        }

        const payload = buildPublicList(user, externalId);
        if (!payload) {
            return res.status(404).json({ message: 'List not found' });
        }

        return res.json(payload);
    });
});

router.post('/api/public/insight', (req, res) => {
    const externalId = String(req.body.externalId || '').trim();
    const itemId = typeof req.body.itemId === 'undefined' ? '' : req.body.itemId;
    const type = String(req.body.type || '').trim();
    const allowedTypes = ['listView', 'listCopy', 'gearClick', 'promoClick'];

    if (!externalId || !allowedTypes.includes(type) || typeof itemId !== 'string') {
        return res.status(400).json({ message: 'Invalid insight event' });
    }

    db.users.findOne({ 'library.lists.externalId': externalId }, (err, user) => {
        if (err || !user || !user.library) {
            return res.status(200).json({ message: 'ok' });
        }

        if (!buildPublicList(user, externalId)) {
            return res.status(200).json({ message: 'ok' });
        }

        if (!user.library.insights) {
            user.library.insights = {};
        }

        const insights = user.library.insights;
        if (typeof insights.profileViews !== 'number') insights.profileViews = 0;
        if (!insights.listViews || typeof insights.listViews !== 'object') insights.listViews = {};
        if (!insights.listCopies || typeof insights.listCopies !== 'object') insights.listCopies = {};
        if (!insights.gearClicks || typeof insights.gearClicks !== 'object') insights.gearClicks = {};
        if (!insights.promoClicks || typeof insights.promoClicks !== 'object') insights.promoClicks = {};

        if (type === 'listView') {
            insights.listViews[externalId] = (insights.listViews[externalId] || 0) + 1;
        } else if (type === 'listCopy') {
            insights.listCopies[externalId] = (insights.listCopies[externalId] || 0) + 1;
        } else if (type === 'gearClick' && itemId) {
            insights.gearClicks[itemId] = (insights.gearClicks[itemId] || 0) + 1;
        } else if (type === 'promoClick' && itemId) {
            insights.promoClicks[itemId] = (insights.promoClicks[itemId] || 0) + 1;
        }

        db.users.save(user, (saveErr) => {
            if (saveErr) {
                logWithRequest(req, { message: 'Public insight save error', externalId, error: saveErr.message });
                return res.status(500).json({ message: 'An error occurred' });
            }
            return res.json({ message: 'ok' });
        });
    });
});

router.get('/api/auth/me', (req, res) => {
    authenticateUser(req, res, (req, res, user) => {
        return res.json({ isModerator: isModerator(user.username) });
    });
});

router.get('/api/backup', (req, res) => {
    authenticateUser(req, res, (req, res, user) => {
        const plan = (user.library && user.library.entitlements && user.library.entitlements.plan) || 'free';
        if (plan !== 'supporter' && plan !== 'creator') {
            return res.status(403).json({ message: 'Trail plan required.' });
        }
        const filename = `zenpak-backup-${user.username}-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({ username: user.username, exportedAt: new Date().toISOString(), library: user.library });
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

const communityRouter = require('./community-endpoints.js');
router.use('/api/community', communityRouter);

const guideRouter = require('./guide-endpoints.js');
router.use('/api/guide', guideRouter);

const supportRouter = require('./support-endpoints.js');
router.use('/api/support', supportRouter);

module.exports = router;
