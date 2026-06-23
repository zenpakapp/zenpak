'use strict';

const express = require('express');
const router = express.Router();
const db = require('./db.js');
const auth = require('./auth.js');

const { isPublicVisibility } = require('../client/services/public-visibility.js');

function isGuide(user) {
    const plan = (user.library && user.library.entitlements && user.library.entitlements.plan) || 'free';
    return plan === 'creator';
}

function publicLists(user) {
    return ((user.library && user.library.lists) || []).filter(
        l => l.externalId && isPublicVisibility(l.visibility)
    );
}

// GET /api/guide/profile
router.get('/profile', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        if (!isGuide(user)) return res.status(403).json({ message: 'Guide tier required' });

        const profile = user.library.publicProfile || {};
        const creator = user.library.creator || {};

        return res.json({
            bio: profile.bio || '',
            links: Array.isArray(profile.links) ? profile.links : [],
            gearPhilosophy: Array.isArray(profile.gearPhilosophy) ? profile.gearPhilosophy : [],
            affiliateRules: Array.isArray(creator.affiliateRules) ? creator.affiliateRules : [],
            disclosure: creator.disclosure || '',
        });
    });
});

// PUT /api/guide/profile
router.put('/profile', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        if (!isGuide(user)) return res.status(403).json({ message: 'Guide tier required' });

        const bio = typeof req.body.bio === 'string' ? req.body.bio.slice(0, 500) : '';
        const links = Array.isArray(req.body.links) ? req.body.links.slice(0, 5).map(l => ({
            label: String(l.label || '').slice(0, 100),
            url: String(l.url || '').slice(0, 500),
        })) : [];
        const gearPhilosophy = Array.isArray(req.body.gearPhilosophy)
            ? req.body.gearPhilosophy.slice(0, 5).map(s => String(s).slice(0, 100))
            : [];

        if (!user.library.publicProfile) user.library.publicProfile = {};
        user.library.publicProfile.bio = bio;
        user.library.publicProfile.links = links;
        user.library.publicProfile.gearPhilosophy = gearPhilosophy;

        try {
            await db.users.save(user);
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// PUT /api/guide/affiliate-rules
router.put('/affiliate-rules', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        if (!isGuide(user)) return res.status(403).json({ message: 'Guide tier required' });

        const affiliateRules = Array.isArray(req.body.affiliateRules)
            ? req.body.affiliateRules.slice(0, 50).map(r => ({
                type: ['brand', 'shop', 'domain'].includes(r.type) ? r.type : 'brand',
                match: String(r.match || '').slice(0, 200),
                affiliateUrl: String(r.affiliateUrl || '').slice(0, 500),
                appendParam: String(r.appendParam || '').slice(0, 200),
                promoCode: String(r.promoCode || '').slice(0, 100),
                promoLabel: String(r.promoLabel || '').slice(0, 100),
            }))
            : [];
        const disclosure = typeof req.body.disclosure === 'string' ? req.body.disclosure.slice(0, 500) : '';

        if (!user.library.creator) user.library.creator = {};
        user.library.creator.affiliateRules = affiliateRules;
        user.library.creator.disclosure = disclosure;

        try {
            await db.users.save(user);
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// GET /api/guide/items
router.get('/items', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        if (!isGuide(user)) return res.status(403).json({ message: 'Guide tier required' });

        const affiliateRules = (user.library.creator && user.library.creator.affiliateRules) || [];

        function resolveAppliedRule(item) {
            for (const rule of affiliateRules) {
                if (!rule.match) continue;
                const matchLower = rule.match.toLowerCase();
                if (rule.type === 'brand' && item.brand && item.brand.toLowerCase() === matchLower) {
                    return `brand:${rule.match}`;
                }
                if (rule.type === 'shop' && item.url && item.url.toLowerCase().includes(matchLower)) {
                    return `shop:${rule.match}`;
                }
                if (rule.type === 'domain' && item.url) {
                    try {
                        const hostname = new URL(item.url).hostname.replace(/^www\./i, '').toLowerCase();
                        if (hostname === matchLower) return `domain:${rule.match}`;
                    } catch (_) {}
                }
            }
            return null;
        }

        const libraryCategories = user.library.categories || [];
        const libraryItems = user.library.items || [];

        const result = publicLists(user).map(list => {
            const categoryItems = (list.categoryIds || []).flatMap(catId => {
                const cat = libraryCategories.find(c => c.id == catId);
                return (cat && cat.categoryItems) ? cat.categoryItems : [];
            });
            return {
                listId: String(list.id),
                listName: list.name || '',
                items: categoryItems.map(ci => {
                    const item = libraryItems.find(i => i.id == ci.itemId);
                    if (!item) return null;
                    return {
                        itemId: String(item.id),
                        name: item.name || '',
                        brand: item.brand || '',
                        affiliateUrl: item.affiliateUrl || '',
                        promoCode: item.promoCode || '',
                        promoLabel: item.promoLabel || '',
                        appliedRule: resolveAppliedRule(item),
                    };
                }).filter(Boolean),
            };
        });

        return res.json(result);
    });
});

// PUT /api/guide/items
router.put('/items', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        if (!isGuide(user)) return res.status(403).json({ message: 'Guide tier required' });

        const updates = Array.isArray(req.body) ? req.body.slice(0, 1000) : [];

        const libraryItems = user.library.items || [];
        const libraryCategories = user.library.categories || [];

        for (const update of updates) {
            const listId = String(update.listId || '');
            const itemId = String(update.itemId || '');
            const list = (user.library.lists || []).find(l => String(l.id) === listId);
            if (!list || !isPublicVisibility(list.visibility)) continue;

            // verify itemId is actually in this list via categoryIds
            const inList = (list.categoryIds || []).some(catId => {
                const cat = libraryCategories.find(c => c.id == catId);
                return cat && (cat.categoryItems || []).some(ci => String(ci.itemId) === itemId);
            });
            if (!inList) continue;

            const item = libraryItems.find(i => String(i.id) === itemId);
            if (item) {
                item.affiliateUrl = String(update.affiliateUrl || '').slice(0, 500);
                item.promoCode = String(update.promoCode || '').slice(0, 100);
                item.promoLabel = String(update.promoLabel || '').slice(0, 100);
            }
        }

        try {
            await db.users.save(user);
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

module.exports = router;
