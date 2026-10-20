// The browser side of the visit statistics (Umami, see server/analytics.js). Only public pages are
// counted as visits: the editor and the account are not. A named event (sign-up, copy, publish)
// always goes through, even from a private page, and carries no data of the person.
const PUBLIC_PATHS = ['/welcome', '/signin', '/register', '/community', '/pricing', '/about', '/guide', '/privacy', '/terms', '/legal'];
const PUBLIC_PREFIXES = ['/p/', '/u/', '/community/'];

export function shouldTrackPath(pathname) {
    return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Umami calls this with what it is about to send; returning false cancels it.
export function beforeSend(type, payload) {
    if (!payload) return false;
    if (payload.name) return payload;
    let pathname = '';
    try {
        pathname = new URL(payload.url || '/', 'https://zenpak.invalid').pathname;
    } catch (err) {
        return false;
    }
    return shouldTrackPath(pathname) ? payload : false;
}

// Never break the page for the statistics: a blocked script, or none, is simply ignored.
export function trackEvent(name, data) {
    try {
        if (typeof window === 'undefined' || !window.umami || typeof window.umami.track !== 'function') return;
        if (data === undefined) window.umami.track(name);
        else window.umami.track(name, data);
    } catch (err) {
        // ignored on purpose
    }
}

export function installAnalyticsFilter(target = window) {
    // eslint-disable-next-line no-param-reassign
    target.zenpakAnalyticsBeforeSend = beforeSend;
}
