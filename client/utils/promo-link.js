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

module.exports = { promoLinkUrl, ruleHostname };
