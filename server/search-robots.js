const db = require('./db.js');
const { allowsSearchIndexing } = require('../client/services/public-visibility.js');
const { getPublishedOwner, findLiveList } = require('./list-versions.js');
const { searchIndexingOpen } = require('./account-age.js');

function isSearchIndexable(owner, visibility) {
    return Boolean(owner) && !owner.banned && allowsSearchIndexing(visibility) && searchIndexingOpen(owner);
}

async function listIsIndexable(externalId) {
    const owner = await getPublishedOwner(externalId);
    const list = findLiveList(owner, externalId);
    return !list?.takenDown && isSearchIndexable(owner, list?.visibility);
}

async function profileIsIndexable(username) {
    const user = await db.users.findOne({ username });
    return isSearchIndexable(user, user?.library?.publicProfile?.visibility);
}

function setRobotsHeader(res, indexable) {
    if (!indexable) res.setHeader('X-Robots-Tag', 'noindex');
}

// The SPA shell remains available if the lookup fails, with indexing disabled.
function robotsHeader(check) {
    return async (req, res, next) => {
        const indexable = await check(req).catch(() => false);
        setRobotsHeader(res, indexable);
        next();
    };
}

module.exports = {
    isSearchIndexable, listIsIndexable, profileIsIndexable, setRobotsHeader, robotsHeader,
};
