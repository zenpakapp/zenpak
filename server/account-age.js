// How long an account has existed, and from when its lists may be listed by search engines.
//
// A list reaches search engines only through the visibility "indexable". Opening that to a
// brand-new account lets someone create throw-away accounts and have their text indexed within
// minutes. The account's age comes from its _id (a MongoDB ObjectId starts with its creation time),
// so it exists for every account, including the ones made through Google and the older ones.

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INDEXING_DELAY_DAYS = 7;

// INDEXING_DELAY_DAYS (or the indexingDelayDays config key) sets the delay; 0 turns the wait off.
function indexingDelayDays(setting) {
    if (typeof setting === 'undefined' || setting === null || setting === '') return DEFAULT_INDEXING_DELAY_DAYS;
    const days = Number(setting);
    return Number.isFinite(days) && days >= 0 ? days : DEFAULT_INDEXING_DELAY_DAYS;
}

// The delay of this instance: the INDEXING_DELAY_DAYS variable, else the indexingDelayDays config key.
function configuredDelayDays() {
    // eslint-disable-next-line global-require
    const config = require('config');
    return indexingDelayDays(process.env.INDEXING_DELAY_DAYS
        || (config.has('indexingDelayDays') ? config.get('indexingDelayDays') : undefined));
}

function accountCreatedAt(user) {
    const id = user && user._id;
    return id && typeof id.getTimestamp === 'function' ? id.getTimestamp() : null;
}

// An account whose age cannot be read is not blocked: the wait is a brake on new accounts, and an
// unknown one is no reason to refuse.
function canListForSearch(user, { now = new Date(), delayDays = DEFAULT_INDEXING_DELAY_DAYS } = {}) {
    const created = accountCreatedAt(user);
    if (!created) return true;
    return now.getTime() - created.getTime() >= delayDays * DAY_MS;
}

module.exports = {
    DEFAULT_INDEXING_DELAY_DAYS,
    indexingDelayDays,
    configuredDelayDays,
    accountCreatedAt,
    canListForSearch,
};
