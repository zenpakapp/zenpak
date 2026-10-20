// Visit statistics with Umami (cookieless). Off until the hosted config gives a script address and a
// site id, so a self-hosted copy of this repo and a local run send nothing. The tag asks for as
// little as possible: it honours Do Not Track, drops what follows the "?" of an address (so a
// search typed in Discover is never sent), and lets our own function drop the private pages.
const config = require('config');

// What the hosted config gives, or nothing: both values are empty by default.
function analyticsConfig() {
    return {
        scriptUrl: config.has('analyticsScriptUrl') ? config.get('analyticsScriptUrl') : '',
        websiteId: config.has('analyticsWebsiteId') ? config.get('analyticsWebsiteId') : '',
    };
}

function parseScriptUrl(scriptUrl) {
    try {
        const url = new URL(scriptUrl);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
    } catch (err) {
        return null;
    }
}

function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function analyticsTag({ scriptUrl, websiteId } = {}) {
    const url = parseScriptUrl(scriptUrl);
    if (!url || !websiteId) return '';
    return `<script defer src="${escapeAttribute(url.href)}" data-website-id="${escapeAttribute(websiteId)}" data-do-not-track="true" data-exclude-search="true" data-before-send="zenpakAnalyticsBeforeSend"></script>`;
}

// The one origin the security policy lets load a script, or '' when the statistics are off.
function analyticsOrigin({ scriptUrl, websiteId } = {}) {
    const url = parseScriptUrl(scriptUrl);
    return url && websiteId ? url.origin : '';
}

module.exports = { analyticsConfig, analyticsTag, analyticsOrigin };
