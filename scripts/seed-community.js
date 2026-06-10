'use strict';
// Usage: node scripts/seed-community.js
// Creates 3 test users (base/trail/guide) with public lists, follows, and feed events.

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGO_URL = 'mongodb://localhost/lighterpack';
const PASSWORD = 'testtest';

const USERS = [
    {
        username: 'seed_base',
        email: 'seed_base@lighterpack.test',
        plan: 'free',
        displayName: 'Alex Dubois',
        bio: 'Randonneur du dimanche. Vosges et Alpes du nord.',
        location: 'Strasbourg, FR',
        links: [],
        gearPhilosophy: ['minimalist'],
        lists: [
            {
                name: 'Weekend hike — Vosges',
                visibility: 'discoverable',
                description: 'Sortie 2 jours avec bivouac léger.',
                totalBaseWeight: 4800,
                totalQty: 22,
                copyCount: 3,
                daysAgo: 5,
            },
        ],
    },
    {
        username: 'seed_trail',
        email: 'seed_trail@lighterpack.test',
        plan: 'supporter',
        displayName: 'Marie Fontaine',
        bio: 'Ultralight gear addict. GR20 northbound done solo.',
        location: 'Lyon, FR',
        links: [{ url: 'https://marierando.fr', label: 'marierando.fr' }],
        gearPhilosophy: ['ultralight', 'leave no trace'],
        lists: [
            {
                name: 'GR20 Nord — UL setup',
                visibility: 'discoverable',
                description: 'Base weight 4.2 kg pour le GR20 nord. Testé juillet 2024.',
                totalBaseWeight: 4200,
                totalQty: 18,
                copyCount: 12,
                daysAgo: 3,
            },
            {
                name: 'Winter layering system',
                visibility: 'discoverable',
                description: 'Layering pour randonnée hivernale en moyenne montagne.',
                totalBaseWeight: 3100,
                totalQty: 9,
                copyCount: 7,
                daysAgo: 14,
            },
        ],
    },
    {
        username: 'seed_guide',
        email: 'seed_guide@lighterpack.test',
        plan: 'creator',
        displayName: 'Thomas Renard',
        bio: 'Mountain guide & gear reviewer. JMT thru-hiker 2023. Testing gear so you don\'t have to.',
        location: 'Chamonix, FR',
        links: [
            { url: 'https://thomasrenard.guide', label: 'thomasrenard.guide' },
            { url: 'https://instagram.com/thomas.renard.guide', label: '@thomas.renard.guide' },
        ],
        gearPhilosophy: ['ultralight', 'functionality first', 'buy once buy right'],
        lists: [
            {
                name: 'JMT thru-hike 2025',
                visibility: 'discoverable',
                description: 'Full setup for 21-day JMT. Base weight 4.1 kg. Includes resupply strategy.',
                totalBaseWeight: 4100,
                totalQty: 31,
                copyCount: 48,
                daysAgo: 1,
            },
            {
                name: 'Fastpacking essentials',
                visibility: 'discoverable',
                description: 'Minimalist setup for speed-focused mountain trips. Sub-3 kg base.',
                totalBaseWeight: 2800,
                totalQty: 14,
                copyCount: 31,
                daysAgo: 8,
            },
            {
                name: 'Desert kit — PCT Section B',
                visibility: 'private',
                description: 'Draft — not public yet.',
                totalBaseWeight: 3600,
                totalQty: 19,
                copyCount: 0,
                daysAgo: 2,
            },
        ],
    },
];

function makeExternalId() {
    return Math.random().toString(36).slice(2, 9);
}

function daysAgoDate(n) {
    return new Date(Date.now() - n * 86400000);
}

// Gear catalog shared across lists
const GEAR = {
    // Shelter
    shelter_tent:   { name: 'Zpacks Duplex', brand: 'Zpacks', weight: 510, shop: 'https://zpacks.com', description: 'Cuben fiber DCF 2P tent' },
    shelter_tarp:   { name: 'MLD Grace Duo Tarp', brand: 'MLD', weight: 310, shop: '', description: 'Silnylon 8x10 tarp' },
    shelter_bivy:   { name: 'SOL Escape Bivvy', brand: 'SOL', weight: 142, shop: '', description: 'Emergency bivy for UL setups' },
    // Sleep
    sleep_bag:      { name: 'Enlightened Equipment Revelation 20°', brand: 'EE', weight: 510, shop: '', description: 'Down quilt 850fp' },
    sleep_pad:      { name: 'Nemo Tensor Insulated', brand: 'Nemo', weight: 410, shop: '', description: 'R-value 3.5 mummy cut' },
    sleep_liner:    { name: 'Sea to Summit Reactor', brand: 'Sea to Summit', weight: 115, shop: '', description: 'Thermolite liner +7°C' },
    // Pack
    pack_main:      { name: 'Hyperlite Mountain Gear 2400 Windrider', brand: 'HMG', weight: 680, shop: '', description: 'DCF roll-top 40L' },
    pack_daypack:   { name: 'Gossamer Gear Gorilla 40', brand: 'GG', weight: 584, shop: '', description: 'Frameless 40L' },
    pack_fastpack:  { name: 'Salomon ADV Skin 12', brand: 'Salomon', weight: 340, shop: '', description: 'Running vest 12L' },
    // Clothing
    clothes_jacket: { name: 'Montbell Plasma 1000 Jacket', brand: 'Montbell', weight: 132, shop: '', description: '1000fp down jacket' },
    clothes_rain:   { name: 'Montbell Versalite Rain Jacket', brand: 'Montbell', weight: 155, shop: '', description: '2.5L hardshell 100g/m²' },
    clothes_fleece: { name: 'Patagonia R1 Hoody', brand: 'Patagonia', weight: 340, shop: '', description: 'Grid fleece midlayer' },
    clothes_pants:  { name: 'Arc\'teryx Gamma SL Pants', brand: 'Arc\'teryx', weight: 276, shop: '', description: 'Softshell windpants' },
    clothes_base:   { name: 'Icebreaker 150 Merino Tee', brand: 'Icebreaker', weight: 130, shop: '', description: 'Merino wool base layer' },
    clothes_socks:  { name: 'Darn Tough Hiker Merino', brand: 'Darn Tough', weight: 65, shop: '', description: 'Cushion ankle sock' },
    clothes_gloves: { name: 'Black Diamond Midweight Screentap', brand: 'Black Diamond', weight: 56, shop: '', description: 'Fleece liner gloves' },
    clothes_hat:    { name: 'Buff Merino Wool Hat', brand: 'Buff', weight: 48, shop: '', description: 'Reversible knit hat' },
    // Footwear
    shoes_trail:    { name: 'Altra Lone Peak 7', brand: 'Altra', weight: 530, shop: '', description: 'Zero drop trail runner' },
    shoes_camp:     { name: 'Crocs Classic Clogs', brand: 'Crocs', weight: 280, shop: '', description: 'Camp shoes' },
    // Navigation
    nav_gps:        { name: 'Garmin inReach Mini 2', brand: 'Garmin', weight: 100, shop: '', description: 'GPS + satellite communicator' },
    nav_map:        { name: 'Printed topo map', brand: '', weight: 40, shop: '', description: 'Waterproofed section map' },
    nav_compass:    { name: 'Suunto A-10', brand: 'Suunto', weight: 25, shop: '', description: 'Baseplate compass' },
    // Cooking
    cook_stove:     { name: 'MSR PocketRocket 2', brand: 'MSR', weight: 73, shop: '', description: 'Canister stove' },
    cook_pot:       { name: 'Toaks 750ml Titanium Pot', brand: 'Toaks', weight: 106, shop: '', description: 'Ti pot with lid' },
    cook_spork:     { name: 'Toaks Titanium Long Spoon', brand: 'Toaks', weight: 18, shop: '', description: 'Ti spork' },
    cook_lighter:   { name: 'BIC Mini', brand: 'BIC', weight: 11, shop: '', description: 'Backup lighter' },
    // Water
    water_filter:   { name: 'Sawyer Squeeze', brand: 'Sawyer', weight: 85, shop: '', description: 'Inline squeeze filter' },
    water_bottle:   { name: 'Smartwater 1L', brand: 'Smartwater', weight: 32, shop: '', description: 'LDPE bottle x2' },
    water_tablets:  { name: 'Aquatabs', brand: 'Medentech', weight: 15, shop: '', description: 'Backup purification x10' },
    // Hygiene
    hyg_trowel:     { name: 'Deuce of Spades', brand: 'Deuce', weight: 28, shop: '', description: 'Ti cat hole trowel' },
    hyg_soap:       { name: 'Dr. Bronner\'s Castile Soap 2oz', brand: 'Dr. Bronner\'s', weight: 57, shop: '', description: 'Biodegradable soap' },
    hyg_tp:         { name: 'TP + wag bag', brand: '', weight: 40, shop: '', description: 'Partial roll + wag bags' },
    // Safety
    safe_aid:       { name: 'Adventure Medical .3 Kit', brand: 'Adventure Medical', weight: 99, shop: '', description: 'Minimalist first aid' },
    safe_light:     { name: 'Black Diamond Spot 400', brand: 'Black Diamond', weight: 91, shop: '', description: 'Headlamp 400 lumens' },
    safe_whistle:   { name: 'Fox 40 Micro', brand: 'Fox 40', weight: 8, shop: '', description: 'Emergency whistle' },
    // Electronics
    elec_battery:   { name: 'Anker PowerCore 10000 PD', brand: 'Anker', weight: 180, shop: '', description: '10000mAh USB-C powerbank' },
    elec_cable:     { name: 'Anker USB-C cable 0.3m', brand: 'Anker', weight: 18, shop: '', description: 'Braided short cable' },
    // Accessories
    acc_poles:      { name: 'Black Diamond Distance Carbon Z', brand: 'Black Diamond', weight: 254, shop: '', description: 'Carbon Z-poles 115cm' },
    acc_gaiters:    { name: 'Dirty Girl Gaiters', brand: 'Dirty Girl', weight: 28, shop: '', description: 'Trail gaiters' },
    acc_sunscreen:  { name: 'Banana Boat SPF50 1oz', brand: 'Banana Boat', weight: 30, shop: '', description: 'Travel size sunscreen' },
    acc_buff:       { name: 'Buff Original', brand: 'Buff', weight: 36, shop: '', description: 'Neck gaiter / sun protection' },
    acc_sunglasses: { name: 'Julbo Cham', brand: 'Julbo', weight: 28, shop: '', description: 'Mountain sunglasses Cat 4' },
    acc_wallet:     { name: 'Matador Pocket Wallet', brand: 'Matador', weight: 16, shop: '', description: 'Waterproof slim wallet' },
};

// List templates: array of { name, items: [{key, qty}] }
const LIST_TEMPLATES = {
    'Weekend hike — Vosges': [
        { name: 'Shelter', items: [{ key: 'shelter_tarp', qty: 1 }, { key: 'shelter_bivy', qty: 1 }] },
        { name: 'Sleep', items: [{ key: 'sleep_bag', qty: 1 }, { key: 'sleep_pad', qty: 1 }] },
        { name: 'Pack', items: [{ key: 'pack_daypack', qty: 1 }] },
        { name: 'Clothing', items: [{ key: 'clothes_jacket', qty: 1 }, { key: 'clothes_rain', qty: 1 }, { key: 'clothes_base', qty: 1 }, { key: 'clothes_socks', qty: 2 }, { key: 'clothes_hat', qty: 1 }] },
        { name: 'Footwear', items: [{ key: 'shoes_trail', qty: 1 }, { key: 'shoes_camp', qty: 1 }] },
        { name: 'Cooking', items: [{ key: 'cook_stove', qty: 1 }, { key: 'cook_pot', qty: 1 }, { key: 'cook_spork', qty: 1 }, { key: 'cook_lighter', qty: 1 }] },
        { name: 'Water', items: [{ key: 'water_filter', qty: 1 }, { key: 'water_bottle', qty: 2 }] },
        { name: 'Safety', items: [{ key: 'safe_aid', qty: 1 }, { key: 'safe_light', qty: 1 }, { key: 'safe_whistle', qty: 1 }] },
        { name: 'Navigation', items: [{ key: 'nav_map', qty: 1 }, { key: 'nav_compass', qty: 1 }] },
    ],
    'GR20 Nord — UL setup': [
        { name: 'Shelter', items: [{ key: 'shelter_tent', qty: 1 }] },
        { name: 'Sleep', items: [{ key: 'sleep_bag', qty: 1 }, { key: 'sleep_pad', qty: 1 }] },
        { name: 'Pack', items: [{ key: 'pack_main', qty: 1 }] },
        { name: 'Clothing', items: [{ key: 'clothes_jacket', qty: 1 }, { key: 'clothes_rain', qty: 1 }, { key: 'clothes_fleece', qty: 1 }, { key: 'clothes_base', qty: 2 }, { key: 'clothes_pants', qty: 1 }, { key: 'clothes_socks', qty: 3 }, { key: 'clothes_hat', qty: 1 }, { key: 'clothes_gloves', qty: 1 }] },
        { name: 'Footwear', items: [{ key: 'shoes_trail', qty: 1 }, { key: 'shoes_camp', qty: 1 }, { key: 'acc_gaiters', qty: 1 }] },
        { name: 'Cooking', items: [{ key: 'cook_stove', qty: 1 }, { key: 'cook_pot', qty: 1 }, { key: 'cook_spork', qty: 1 }, { key: 'cook_lighter', qty: 1 }] },
        { name: 'Water', items: [{ key: 'water_filter', qty: 1 }, { key: 'water_bottle', qty: 2 }, { key: 'water_tablets', qty: 1 }] },
        { name: 'Navigation', items: [{ key: 'nav_gps', qty: 1 }, { key: 'nav_map', qty: 1 }] },
        { name: 'Safety', items: [{ key: 'safe_aid', qty: 1 }, { key: 'safe_light', qty: 1 }, { key: 'safe_whistle', qty: 1 }] },
        { name: 'Hygiene', items: [{ key: 'hyg_trowel', qty: 1 }, { key: 'hyg_soap', qty: 1 }, { key: 'hyg_tp', qty: 1 }] },
        { name: 'Accessories', items: [{ key: 'acc_poles', qty: 1 }, { key: 'acc_sunscreen', qty: 1 }, { key: 'acc_buff', qty: 1 }, { key: 'acc_sunglasses', qty: 1 }] },
    ],
    'Winter layering system': [
        { name: 'Base layers', items: [{ key: 'clothes_base', qty: 2 }, { key: 'sleep_liner', qty: 1 }] },
        { name: 'Mid layers', items: [{ key: 'clothes_fleece', qty: 1 }, { key: 'clothes_jacket', qty: 1 }] },
        { name: 'Shell', items: [{ key: 'clothes_rain', qty: 1 }, { key: 'clothes_pants', qty: 1 }] },
        { name: 'Extremities', items: [{ key: 'clothes_gloves', qty: 1 }, { key: 'clothes_hat', qty: 1 }, { key: 'acc_buff', qty: 1 }, { key: 'acc_sunglasses', qty: 1 }] },
        { name: 'Footwear', items: [{ key: 'shoes_trail', qty: 1 }, { key: 'clothes_socks', qty: 2 }, { key: 'acc_gaiters', qty: 1 }] },
    ],
    'JMT thru-hike 2025': [
        { name: 'Shelter', items: [{ key: 'shelter_tent', qty: 1 }] },
        { name: 'Sleep', items: [{ key: 'sleep_bag', qty: 1 }, { key: 'sleep_pad', qty: 1 }] },
        { name: 'Pack', items: [{ key: 'pack_main', qty: 1 }] },
        { name: 'Clothing', items: [{ key: 'clothes_jacket', qty: 1 }, { key: 'clothes_rain', qty: 1 }, { key: 'clothes_fleece', qty: 1 }, { key: 'clothes_base', qty: 2 }, { key: 'clothes_pants', qty: 1 }, { key: 'clothes_socks', qty: 4 }, { key: 'clothes_hat', qty: 1 }, { key: 'clothes_gloves', qty: 1 }] },
        { name: 'Footwear', items: [{ key: 'shoes_trail', qty: 1 }, { key: 'shoes_camp', qty: 1 }, { key: 'acc_gaiters', qty: 1 }] },
        { name: 'Cooking', items: [{ key: 'cook_stove', qty: 1 }, { key: 'cook_pot', qty: 1 }, { key: 'cook_spork', qty: 1 }, { key: 'cook_lighter', qty: 1 }] },
        { name: 'Water', items: [{ key: 'water_filter', qty: 1 }, { key: 'water_bottle', qty: 2 }, { key: 'water_tablets', qty: 1 }] },
        { name: 'Navigation', items: [{ key: 'nav_gps', qty: 1 }, { key: 'nav_map', qty: 1 }, { key: 'nav_compass', qty: 1 }] },
        { name: 'Safety', items: [{ key: 'safe_aid', qty: 1 }, { key: 'safe_light', qty: 1 }, { key: 'safe_whistle', qty: 1 }] },
        { name: 'Hygiene', items: [{ key: 'hyg_trowel', qty: 1 }, { key: 'hyg_soap', qty: 1 }, { key: 'hyg_tp', qty: 1 }] },
        { name: 'Electronics', items: [{ key: 'elec_battery', qty: 1 }, { key: 'elec_cable', qty: 1 }] },
        { name: 'Accessories', items: [{ key: 'acc_poles', qty: 1 }, { key: 'acc_sunscreen', qty: 1 }, { key: 'acc_buff', qty: 1 }, { key: 'acc_sunglasses', qty: 1 }, { key: 'acc_wallet', qty: 1 }] },
    ],
    'Fastpacking essentials': [
        { name: 'Shelter', items: [{ key: 'shelter_bivy', qty: 1 }] },
        { name: 'Sleep', items: [{ key: 'sleep_bag', qty: 1 }, { key: 'sleep_pad', qty: 1 }] },
        { name: 'Pack', items: [{ key: 'pack_fastpack', qty: 1 }] },
        { name: 'Clothing', items: [{ key: 'clothes_jacket', qty: 1 }, { key: 'clothes_rain', qty: 1 }, { key: 'clothes_base', qty: 1 }, { key: 'clothes_socks', qty: 2 }] },
        { name: 'Footwear', items: [{ key: 'shoes_trail', qty: 1 }, { key: 'acc_gaiters', qty: 1 }] },
        { name: 'Cooking', items: [{ key: 'cook_pot', qty: 1 }, { key: 'cook_spork', qty: 1 }] },
        { name: 'Water', items: [{ key: 'water_filter', qty: 1 }, { key: 'water_bottle', qty: 1 }] },
        { name: 'Navigation', items: [{ key: 'nav_gps', qty: 1 }] },
        { name: 'Safety', items: [{ key: 'safe_light', qty: 1 }, { key: 'safe_whistle', qty: 1 }] },
    ],
    'Desert kit — PCT Section B': [
        { name: 'Shelter', items: [{ key: 'shelter_tarp', qty: 1 }] },
        { name: 'Sleep', items: [{ key: 'sleep_bag', qty: 1 }, { key: 'sleep_pad', qty: 1 }] },
        { name: 'Pack', items: [{ key: 'pack_main', qty: 1 }] },
        { name: 'Clothing', items: [{ key: 'clothes_base', qty: 1 }, { key: 'clothes_rain', qty: 1 }, { key: 'clothes_socks', qty: 2 }, { key: 'acc_buff', qty: 1 }, { key: 'acc_sunglasses', qty: 1 }] },
        { name: 'Footwear', items: [{ key: 'shoes_trail', qty: 1 }] },
        { name: 'Water', items: [{ key: 'water_filter', qty: 1 }, { key: 'water_bottle', qty: 2 }, { key: 'water_tablets', qty: 1 }] },
    ],
};

function buildLibraryItems(listTemplates) {
    // Build a flat items array and categories from templates
    const allItems = [];
    const itemKeyToId = {};

    // Collect all unique gear keys across all templates
    const allKeys = new Set();
    for (const cats of Object.values(listTemplates)) {
        for (const cat of cats) {
            for (const ci of cat.items) allKeys.add(ci.key);
        }
    }

    for (const key of allKeys) {
        const gear = GEAR[key];
        if (!gear) continue;
        const id = Math.floor(Math.random() * 1000000) + 1;
        itemKeyToId[key] = id;
        allItems.push({
            id,
            name: gear.name,
            description: gear.description || '',
            weight: gear.weight,
            authorUnit: 'g',
            price: 0,
            brand: gear.brand || '',
            shop: gear.shop || '',
            image: '',
            imageUrl: '',
            tags: [],
        });
    }

    return { allItems, itemKeyToId };
}

function buildLibrary(u) {
    // Collect templates for this user's lists
    const userTemplates = {};
    for (const l of u.lists) {
        if (LIST_TEMPLATES[l.name]) userTemplates[l.name] = LIST_TEMPLATES[l.name];
    }

    const { allItems, itemKeyToId } = buildLibraryItems(userTemplates);

    // Build library categories (global, shared across lists)
    const allCategoryDefs = {};
    for (const [listName, cats] of Object.entries(userTemplates)) {
        for (const cat of cats) {
            if (!allCategoryDefs[cat.name]) {
                allCategoryDefs[cat.name] = { name: cat.name, items: [] };
            }
        }
    }

    const libraryCategories = Object.values(allCategoryDefs).map((cd) => ({
        id: Math.floor(Math.random() * 1000000) + 1,
        name: cd.name,
        categoryItems: [],
        subtotalWeight: 0,
        subtotalWornWeight: 0,
        subtotalConsumableWeight: 0,
        subtotalPrice: 0,
    }));
    const catNameToId = Object.fromEntries(libraryCategories.map((c) => [c.name, c.id]));

    const lists = u.lists.map((l) => {
        const template = LIST_TEMPLATES[l.name] || [];
        const listCategoryIds = [];
        let computedQty = 0;
        let computedWeight = 0;

        for (const catDef of template) {
            const catId = catNameToId[catDef.name];
            if (!catId) continue;
            listCategoryIds.push(catId);

            // Build categoryItems for this list's category instance
            const categoryItems = catDef.items.map((ci) => {
                const itemId = itemKeyToId[ci.key];
                const gear = GEAR[ci.key];
                if (!itemId || !gear) return null;
                computedQty += ci.qty;
                computedWeight += gear.weight * ci.qty;
                return { itemId, qty: ci.qty, worn: 0, consumable: false, star: 0 };
            }).filter(Boolean);

            // Merge into the library category (accumulate across lists — simplification)
            const libCat = libraryCategories.find((c) => c.id === catId);
            if (libCat) {
                for (const ci of categoryItems) {
                    if (!libCat.categoryItems.find((x) => x.itemId === ci.itemId)) {
                        libCat.categoryItems.push(ci);
                    }
                }
                libCat.subtotalWeight = libCat.categoryItems.reduce((s, ci) => {
                    const gear = allItems.find((it) => it.id === ci.itemId);
                    return s + (gear ? gear.weight * ci.qty : 0);
                }, 0);
            }
        }

        return {
            id: new ObjectId(),
            externalId: l.visibility !== 'private' ? makeExternalId() : undefined,
            name: l.name,
            description: l.description || '',
            visibility: l.visibility,
            totalBaseWeight: computedWeight || l.totalBaseWeight,
            totalWeight: computedWeight || l.totalBaseWeight,
            totalWornWeight: 0,
            totalConsumableWeight: 0,
            totalPackWeight: computedWeight || l.totalBaseWeight,
            totalPrice: 0,
            totalQty: computedQty || l.totalQty,
            copyCount: l.copyCount || 0,
            updatedAt: daysAgoDate(l.daysAgo || 0),
            categoryIds: listCategoryIds,
        };
    });

    return {
        lists,
        items: allItems,
        categories: libraryCategories,
        totalUnit: 'kg',
        itemUnit: 'g',
        currencySymbol: '€',
        showSidebar: true,
        entitlements: {
            plan: u.plan,
            source: 'seed',
            features: [],
        },
        publicProfile: {
            visibility: 'discoverable',
            displayName: u.displayName,
            bio: u.bio || '',
            location: u.location || '',
            links: u.links || [],
            gearPhilosophy: u.gearPhilosophy || [],
            allowSearchIndexing: true,
        },
        insights: {
            listViews: {},
            listCopies: {},
        },
    };
}

async function hashPassword(password) {
    return new Promise((res, rej) =>
        bcrypt.genSalt(10, (e, salt) =>
            bcrypt.hash(password, salt, (e2, h) => (e2 ? rej(e2) : res(h)))
        )
    );
}

async function main() {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db();
    const usersCol = db.collection('users');
    const followsCol = db.collection('follows');
    const feedEventsCol = db.collection('feed_events');

    // Upsert users
    const created = {};
    for (const u of USERS) {
        let doc = await usersCol.findOne({ username: u.username });
        if (doc) {
            // Update library to reflect latest seed data
            await usersCol.updateOne(
                { username: u.username },
                { $set: { library: buildLibrary(u) } }
            );
            doc = await usersCol.findOne({ username: u.username });
            console.log(`  updated  ${u.username} (${u.plan})`);
        } else {
            const hash = await hashPassword(PASSWORD);
            doc = {
                username: u.username,
                email: u.email,
                password: hash,
                token: Math.random().toString(36).slice(2),
                syncToken: 0,
                library: buildLibrary(u),
            };
            await usersCol.insertOne(doc);
            console.log(`  created  ${u.username} (${u.plan})`);
        }
        created[u.username] = doc;
    }

    // Follows: base follows trail and guide / trail follows guide
    const followPairs = [
        ['seed_base', 'seed_trail'],
        ['seed_base', 'seed_guide'],
        ['seed_trail', 'seed_guide'],
    ];

    for (const [follower, followed] of followPairs) {
        const fDoc = created[follower] || await usersCol.findOne({ username: follower });
        const tDoc = created[followed] || await usersCol.findOne({ username: followed });
        if (!fDoc || !tDoc) continue;
        const exists = await followsCol.findOne({
            followerId: new ObjectId(fDoc._id),
            followedId: new ObjectId(tDoc._id),
        });
        if (!exists) {
            await followsCol.insertOne({
                followerId: new ObjectId(fDoc._id),
                followedId: new ObjectId(tDoc._id),
                mode: 'all',
                createdAt: daysAgoDate(2),
            });
            console.log(`  follow   ${follower} → ${followed}`);
        }
    }

    // Feed events: one per public list (list.made-public)
    for (const u of USERS) {
        const doc = created[u.username] || await usersCol.findOne({ username: u.username });
        for (const list of (doc.library.lists || [])) {
            if (!list.externalId) continue;
            const existing = await feedEventsCol.findOne({
                userId: new ObjectId(doc._id),
                listId: String(list.id),
            });
            if (!existing) {
                await feedEventsCol.insertOne({
                    userId: new ObjectId(doc._id),
                    listId: String(list.id),
                    type: 'list.made-public',
                    createdAt: list.updatedAt || daysAgoDate(3),
                });
            }
        }
    }

    await client.close();

    console.log('\nDone. Password: testtest');
    console.log('Profiles:');
    for (const u of USERS) {
        console.log(`  /u/${u.username}  (${u.plan})`);
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
