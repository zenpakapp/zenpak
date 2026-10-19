// Where the promo code of a "domain" rule links to. The rule's value is free text, so it only
// becomes a link when it is a real web address: a name such as "Lyoplilisé" gave
// https://Lyoplilisé, a link that goes nowhere. Anything else is shown as plain text.
//
// Shared by the server (the public profile) and the Guide editor (the warning on a rule), so
// both agree on what counts as an address.
function promoLinkUrl(rule) {
    if (!rule || rule.type !== 'domain') return '';
    const typed = String(rule.match || '').trim();
    if (!typed) return '';

    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(typed);
    const candidate = hasScheme ? typed : `https://${typed}`;
    let parsed;
    try {
        parsed = new URL(candidate);
    } catch (error) {
        return '';
    }

    const labels = parsed.hostname.split('.');
    const isAddress = (parsed.protocol === 'http:' || parsed.protocol === 'https:')
        && labels.length >= 2
        && labels.every(Boolean)
        && /^[a-z][a-z0-9-]+$/i.test(labels[labels.length - 1])
        && !/^\d+(\.\d+){3}$/.test(parsed.hostname);
    return isAddress ? candidate : '';
}

// The website a "domain" rule stands for, to compare with an item's own hostname (without
// "www.", lowercase). However the author wrote it ("https://www.Zpacks.com/promo"), the rule
// matches the items whose link goes to that website. Empty when the value is not an address.
function ruleHostname(rule) {
    const url = promoLinkUrl(rule);
    if (!url) return '';
    try {
        return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    } catch (error) {
        return '';
    }
}

// Capitals, spaces, dashes and other punctuation do not count when comparing names.
function squash(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Whether an item belongs to the shop named by a "shop" rule: either its own "shop" field is
// that name, or the shop name is one of the words of its link's website ("rei" in www.rei.com,
// "garagegrowngear" in garage-grown-gear.com). The "shop" field alone is not enough: no form lets
// anyone fill it in, so a rule relying on it never applied. One word of the hostname, not any text
// of the link, so "rei" does not match reiter.com nor a path that merely mentions it.
function itemMatchesShop(item, match) {
    const wanted = squash(match);
    if (wanted.length < 2 || !item) return false;
    if (squash(item.shop) === wanted) return true;

    let hostname = '';
    try {
        hostname = new URL(String(item.url || '').trim()).hostname;
    } catch (error) {
        return false;
    }
    return hostname.split('.').some((word) => squash(word) === wanted);
}

module.exports = { promoLinkUrl, ruleHostname, itemMatchesShop };
