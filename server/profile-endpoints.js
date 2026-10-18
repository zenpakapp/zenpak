const crypto = require('crypto');
const { readFile } = require('fs/promises');
const express = require('express');
const formidable = require('formidable');
const config = require('config');

const { logWithRequest } = require('./log.js');
const { authenticateUser } = require('./auth.js');
const { syncUserPublicLists } = require('./public-list-projections.js');
const { isReservedDisplayName } = require('./username-policy.js');
const db = require('./db.js');
const {
    detectImageType, errorBody, formFailure, storageFailure,
} = require('./upload-errors.js');

const router = express.Router();

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

async function cloudinaryUpload(imageBuffer, filename, { folder, transformation } = {}) {
    const cloudName = config.get('cloudinaryCloudName');
    const apiKey = config.get('cloudinaryApiKey');
    const apiSecret = config.get('cloudinaryApiSecret');
    if (!cloudName || !apiKey || !apiSecret) {
        throw Object.assign(new Error('Cloudinary is not configured'), { code: 'not-configured' });
    }
    const timestamp = Math.floor(Date.now() / 1000);

    // params sorted alphabetically before apiSecret
    const params = { folder, timestamp };
    if (transformation) params.transformation = transformation;
    const signatureStr = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&') + apiSecret;
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer]), filename || 'image');
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);
    if (transformation) formData.append('transformation', transformation);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
        throw Object.assign(new Error('Cloudinary refused the upload'), {
            status: response.status,
            providerMessage: data.error && data.error.message,
        });
    }
    return data;
}

// Reads one image from a multipart request and stores it. Each way it can fail answers with its
// own status and code (see upload-errors.js) so the client can say what to fix.
function uploadImage(req, res, {
    maxBytes, folder, transformation, onStored,
}) {
    const form = formidable.formidable({ maxFiles: 1, maxFileSize: maxBytes });

    const refuse = ({ status, code }, extra) => res.status(status).json(errorBody(code, extra));

    form.parse(req, async (err, fields, files) => {
        if (err) {
            logWithRequest(req, `image upload refused: ${err.message}`);
            const failure = formFailure(err);
            return refuse(failure, failure.code === 'file-too-large' ? { maxBytes } : undefined);
        }

        const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
        if (!imageFile || !imageFile.filepath) {
            return refuse({ status: 400, code: 'no-file' });
        }

        try {
            const imageBuffer = await readFile(imageFile.filepath);
            // The type the browser sends is only a claim: look at the bytes.
            if (!detectImageType(imageBuffer)) {
                return refuse({ status: 415, code: 'unsupported-type' });
            }
            const stored = await cloudinaryUpload(imageBuffer, imageFile.originalFilename, { folder, transformation });
            return await onStored(stored);
        } catch (uploadError) {
            logWithRequest(req, 'image upload failed');
            logWithRequest(req, uploadError);
            return refuse(storageFailure(uploadError));
        }
    });
}

router.post('/imageUpload', (req, res) => {
    authenticateUser(req, res, (authedReq, authedRes) => {
        uploadImage(authedReq, authedRes, {
            maxBytes: 5 * 1024 * 1024,
            folder: 'lighterpack',
            transformation: 'w_800,f_auto,q_auto',
            onStored: async (stored) => authedRes.json({ data: { id: stored.public_id, url: stored.secure_url } }),
        });
    });
});

router.put('/api/profile', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        if (!user.library.publicProfile) user.library.publicProfile = {};
        const p = user.library.publicProfile;

        if (typeof req.body.displayName === 'string') {
            const displayName = req.body.displayName.slice(0, 100).trim();
            if (isReservedDisplayName(displayName)) {
                return res.status(400).json({ message: 'This display name is reserved for the ZenPak team.' });
            }
            p.displayName = displayName;
        }
        if (typeof req.body.trailName === 'string') p.trailName = req.body.trailName.slice(0, 100);
        if (typeof req.body.bio === 'string') p.bio = req.body.bio.slice(0, 500);
        const VALID_VISIBILITY = ['private', 'shareable', 'discoverable', 'indexable'];
        if (VALID_VISIBILITY.includes(req.body.visibility)) p.visibility = req.body.visibility;
        if (typeof req.body.allowSearchIndexing === 'boolean') p.allowSearchIndexing = req.body.allowSearchIndexing;

        try {
            await db.users.save(user);
            syncUserPublicLists(user).catch(() => {});
            return res.json({ ok: true });
        } catch (e) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

router.delete('/api/profile/avatar', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        try {
            if (!user.library) user.library = {};
            if (!user.library.publicProfile) user.library.publicProfile = {};
            user.library.publicProfile.avatarUrl = '';
            await db.users.save(user);
            syncUserPublicLists(user).catch(() => {});
            return res.json({ ok: true });
        } catch (e) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

router.post('/api/profile/avatar', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        uploadImage(req, res, {
            maxBytes: AVATAR_MAX_BYTES,
            folder: 'lighterpack/avatars',
            transformation: 'w_200,h_200,c_fill,g_face,q_auto,f_auto',
            onStored: async (stored) => {
                if (!user.library) user.library = {};
                if (!user.library.publicProfile) user.library.publicProfile = {};
                user.library.publicProfile.avatarUrl = stored.secure_url;
                await db.users.save(user);
                syncUserPublicLists(user).catch(() => {});

                return res.json({ avatarUrl: stored.secure_url });
            },
        });
    });
});

module.exports = router;
