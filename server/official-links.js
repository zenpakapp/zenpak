// Official short links: an address ZenPak controls that sends to a page chosen by the date, for
// printed material (a sticker on a car, a poster). The printed QR code never changes; where it leads
// does, by editing the configuration: a list during an event, the profile afterwards.
//
// Configuration (key `officialLinks`), one entry per alias:
//   "huguetteraidnette": {
//       "phases":   [ { "until": "2027-03-05T00:00:00+01:00", "to": "/p/abc123" } ],
//       "fallback": "/u/zenpak"
//   }
// The first phase whose date is not past, and whose page is available, wins. A phase with no
// "until" has no end. A page that is empty, not ready or no longer public is skipped, so a printed
// code never leads to a dead page: the last resort is "fallback" (the home page when it is missing).
//
// Targets are paths of this site, written in the configuration: nothing comes from the visitor, so
// this is not an open redirect, and anything that is not a path of this site is ignored.

const ALIAS = /^[a-z0-9][a-z0-9-]{2,39}$/;
const LIST_PATH = /^\/p\/([a-z0-9]{1,32})$/;

// "/something", never "//host" (a scheme-relative address), a scheme, a backslash or a space.
function isSitePath(value) {
    return typeof value === 'string' && /^\/(?!\/)[^\s\\]*$/.test(value);
}

function phaseIsOpen(phase, now) {
    if (!phase || typeof phase !== 'object') return false;
    if (phase.until === undefined || phase.until === null || phase.until === '') return true;
    const end = Date.parse(phase.until);
    return Number.isFinite(end) && now.getTime() < end;
}

// `listIsServable(externalId)` answers whether a list page can be opened by anyone.
async function resolveOfficialTarget(entry, { now = new Date(), listIsServable = async () => true } = {}) {
    const phases = Array.isArray(entry && entry.phases) ? entry.phases : [];
    for (const phase of phases) { // eslint-disable-line no-restricted-syntax
        if (phaseIsOpen(phase, now) && isSitePath(phase.to)) {
            const list = LIST_PATH.exec(phase.to);
            // eslint-disable-next-line no-await-in-loop
            if (!list || await listIsServable(list[1])) return phase.to;
        }
    }
    return entry && isSitePath(entry.fallback) ? entry.fallback : '/';
}

// The aliases that can be served: well-formed, and not a page the site already has.
function validOfficialLinks(links, { reserved = new Set(), warn = () => {} } = {}) {
    const valid = [];
    Object.entries(links && typeof links === 'object' ? links : {}).forEach(([alias, entry]) => {
        if (!ALIAS.test(alias)) {
            warn(`official link "${alias}" skipped: use 3 to 40 lower-case letters, digits or dashes`);
        } else if (reserved.has(alias)) {
            warn(`official link "${alias}" skipped: the site already has this page`);
        } else if (!entry || typeof entry !== 'object') {
            warn(`official link "${alias}" skipped: no configuration`);
        } else {
            valid.push([alias, entry]);
        }
    });
    return valid;
}

// Registers GET /<alias> on an Express router. The answer is a temporary redirect that is never kept
// (a permanent one would be cached by browsers and the next phase would not show), kept out of search
// engines.
function registerOfficialLinks(router, {
    links, reserved, listIsServable, warn,
}) {
    const valid = validOfficialLinks(links, { reserved, warn });
    valid.forEach(([alias, entry]) => {
        router.get(`/${alias}`, async (req, res) => {
            let target;
            try {
                target = await resolveOfficialTarget(entry, { listIsServable });
            } catch (err) {
                target = isSitePath(entry.fallback) ? entry.fallback : '/';
            }
            res.set('Cache-Control', 'no-store');
            res.set('X-Robots-Tag', 'noindex');
            res.redirect(302, target);
        });
    });
    return valid.map(([alias]) => alias);
}

module.exports = {
    ALIAS, isSitePath, resolveOfficialTarget, validOfficialLinks, registerOfficialLinks,
};
