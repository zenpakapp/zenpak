const crypto = require('crypto');
const { readFile } = require('fs/promises');
const express = require('express');
const formidable = require('formidable');
const config = require('config');

const { logWithRequest } = require('./log.js');
const { authenticateUser } = require('./auth.js');
const db = require('./db.js');

const router = express.Router();

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

router.post('/imageUpload', (req, res) => {
    authenticateUser(req, res, imageUpload);
});

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

router.put('/api/profile', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        const plan = (user.library && user.library.entitlements && user.library.entitlements.plan) || 'free';
        if (plan !== 'supporter' && plan !== 'creator') {
            return res.status(403).json({ message: 'Supporter plan required' });
        }

        if (!user.library.publicProfile) user.library.publicProfile = {};
        const p = user.library.publicProfile;

        if (typeof req.body.displayName === 'string') p.displayName = req.body.displayName.slice(0, 100);
        if (typeof req.body.trailName === 'string') p.trailName = req.body.trailName.slice(0, 100);
        if (typeof req.body.bio === 'string') p.bio = req.body.bio.slice(0, 500);
        const VALID_VISIBILITY = ['private', 'shareable', 'discoverable', 'indexable'];
        if (VALID_VISIBILITY.includes(req.body.visibility)) p.visibility = req.body.visibility;
        if (typeof req.body.allowSearchIndexing === 'boolean') p.allowSearchIndexing = req.body.allowSearchIndexing;

        try {
            await db.users.save(user);
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

module.exports = router;
