const dns = require('dns').promises;
const net = require('net');

const TIMEOUT_MS = 8000;
const MAX_BYTES = 512 * 1024; // 512 KB — enough for <head>
const MAX_REDIRECTS = 5;
const blockedAddresses = new net.BlockList();

[
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
].forEach(([address, prefix]) => blockedAddresses.addSubnet(address, prefix, 'ipv4'));

[
    ['::', 128],
    ['::1', 128],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8],
    ['2001:db8::', 32],
].forEach(([address, prefix]) => blockedAddresses.addSubnet(address, prefix, 'ipv6'));

function isPrivateAddress(address) {
    const normalized = String(address || '').toLowerCase().split('%')[0];
    const family = net.isIP(normalized);

    if (family === 4) return blockedAddresses.check(normalized, 'ipv4');
    if (family !== 6) return true;
    return blockedAddresses.check(normalized, 'ipv6');
}

async function assertSafeOutboundUrl(rawUrl, lookup = dns.lookup) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch (err) {
        const unsafeError = new Error('Unsafe outbound URL');
        unsafeError.code = 'UNSAFE_URL';
        throw unsafeError;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)
        || parsed.username
        || parsed.password
        || !parsed.hostname) {
        const unsafeError = new Error('Unsafe outbound URL');
        unsafeError.code = 'UNSAFE_URL';
        throw unsafeError;
    }

    let addresses;
    try {
        addresses = net.isIP(parsed.hostname)
            ? [{ address: parsed.hostname }]
            : await lookup(parsed.hostname, { all: true, verbatim: true });
    } catch (err) {
        const unsafeError = new Error('Unsafe outbound URL');
        unsafeError.code = 'UNSAFE_URL';
        throw unsafeError;
    }

    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
        const unsafeError = new Error('Unsafe outbound URL');
        unsafeError.code = 'UNSAFE_URL';
        throw unsafeError;
    }

    return parsed;
}

async function fetchHtml(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        let currentUrl = url;
        let res;

        for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
            await assertSafeOutboundUrl(currentUrl);
            res = await fetch(currentUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; LighterPack/1.0; +https://lighterpack.com)',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                redirect: 'manual',
            });

            if (![301, 302, 303, 307, 308].includes(res.status)) break;
            if (redirects === MAX_REDIRECTS) throw new Error('Too many redirects');

            const location = res.headers.get('location');
            if (!location) throw new Error('Invalid redirect');
            currentUrl = new URL(location, currentUrl).toString();
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Stream only the first MAX_BYTES to avoid downloading full page
        const reader = res.body.getReader();
        const chunks = [];
        let total = 0;
        while (total < MAX_BYTES) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            total += value.length;
        }
        reader.cancel();
        const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
        return buf.toString('utf-8');
    } finally {
        clearTimeout(timer);
    }
}

function extractMeta(html, property) {
    const patterns = [
        new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
    ];
    for (const re of patterns) {
        const m = html.match(re);
        if (m) return m[1].trim();
    }
    return null;
}

function extractJsonLd(html) {
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        try {
            const data = JSON.parse(m[1]);
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
                const type = item['@type'];
                if (type === 'Product' || type === 'SportsProduct') return item;
                // Sometimes nested in @graph
                if (item['@graph']) {
                    const found = item['@graph'].find((n) => n['@type'] === 'Product' || n['@type'] === 'SportsProduct');
                    if (found) return found;
                }
            }
        } catch (_) { /* malformed JSON-LD — skip */ }
    }
    return null;
}

function parseWeight(raw) {
    if (!raw) return null;
    // Match "45 g", "1.2 kg", "16 oz", "1 lb 3 oz", "450g"
    const kg = raw.match(/(\d+(?:\.\d+)?)\s*kg/i);
    if (kg) return { value: parseFloat(kg[1]) * 1000, unit: 'g' };
    const g = raw.match(/(\d+(?:\.\d+)?)\s*g(?:ram)?s?/i);
    if (g) return { value: parseFloat(g[1]), unit: 'g' };
    const lboz = raw.match(/(\d+)\s*lb(?:s)?\s*(\d+(?:\.\d+)?)\s*oz/i);
    if (lboz) return { value: parseFloat(lboz[1]) * 16 + parseFloat(lboz[2]), unit: 'oz' };
    const oz = raw.match(/(\d+(?:\.\d+)?)\s*oz/i);
    if (oz) return { value: parseFloat(oz[1]), unit: 'oz' };
    const lb = raw.match(/(\d+(?:\.\d+)?)\s*lb/i);
    if (lb) return { value: parseFloat(lb[1]), unit: 'lb' };
    return null;
}

function extractPrice(jsonLd) {
    if (!jsonLd) return null;
    const offers = jsonLd.offers;
    if (!offers) return null;
    const offer = Array.isArray(offers) ? offers[0] : offers;
    const price = offer.price ?? offer.lowPrice;
    if (price != null) return parseFloat(price);
    return null;
}

function extractWeightFromJsonLd(jsonLd) {
    if (!jsonLd) return null;
    // schema.org/Product has weight as QuantitativeValue
    const w = jsonLd.weight;
    if (!w) return null;
    if (typeof w === 'string') return parseWeight(w);
    if (w.value && w.unitCode) {
        const unitMap = { GRM: 'g', KGM: 'kg', ONZ: 'oz', LBR: 'lb' };
        return { value: parseFloat(w.value), unit: unitMap[w.unitCode] || 'g' };
    }
    if (w.value) return { value: parseFloat(w.value), unit: 'g' };
    return null;
}

async function scrapeGear(url) {
    const html = await fetchHtml(url);
    const jsonLd = extractJsonLd(html);

    const name = (jsonLd && jsonLd.name)
        || extractMeta(html, 'og:title')
        || extractMeta(html, 'twitter:title')
        || null;

    const brand = (jsonLd && jsonLd.brand && (jsonLd.brand.name || jsonLd.brand))
        || extractMeta(html, 'og:brand')
        || extractMeta(html, 'product:brand')
        || null;

    const imageUrl = (jsonLd && (Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image))
        || extractMeta(html, 'og:image')
        || null;

    const price = extractPrice(jsonLd)
        || parseFloat(extractMeta(html, 'product:price:amount'))
        || parseFloat(extractMeta(html, 'og:price:amount'))
        || null;

    const weightFromJsonLd = extractWeightFromJsonLd(jsonLd);
    // Fallback: search meta tags and page text near "weight"
    const weightRaw = !weightFromJsonLd
        ? (extractMeta(html, 'product:weight') || null)
        : null;
    const weight = weightFromJsonLd || (weightRaw ? parseWeight(weightRaw) : null);

    return {
        name: name ? name.replace(/\s+/g, ' ').trim() : null,
        brand: typeof brand === 'string' ? brand.trim() : null,
        imageUrl: imageUrl || null,
        price: price && !isNaN(price) ? Math.round(price * 100) / 100 : null,
        weight: weight ? weight.value : null,
        weightUnit: weight ? weight.unit : null,
    };
}

module.exports = {
    assertSafeOutboundUrl,
    isPrivateAddress,
    scrapeGear,
};
