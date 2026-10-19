// Removes the accounts the e2e tests create, and everything that hangs on them: their lists,
// versions, stats, copies, follows, feed events, notifications and reports.
//
// Local databases only. It counts and deletes nothing unless told to:
//   mongosh lighterpack --file scripts/purge-test-data.js                          (count)
//   mongosh lighterpack --eval 'var APPLY=true' --file scripts/purge-test-data.js  (delete)
// Back up first: mongodump --db lighterpack --out /tmp/zenpak-backup
// Edit KEEP and NAMED below: KEEP is never touched, NAMED are test accounts without a long number.
const DRY = typeof APPLY === 'undefined' || !APPLY;
const KEEP = ['fxbenard', 'zenpak', 'demozenpakdoc', 'demozenpakguide', 'seed_base', 'seed_trail', 'seed_guide'];
const NAMED = ['testemail', 'testemail2', 'testemail3', 'testuser', 'test', 'test1', 'e2edebug2', 'vischeck',
  'unitfixmt74dm09', 'qaunit11866', 'curltest17341', 'qa1b', 'francoispignon'];

const targets = db.users.find({
  $or: [{ username: { $regex: /\d{9,}/ } }, { username: { $in: NAMED } }],
  username: { $nin: KEEP },
}, { username: 1, 'library.lists.externalId': 1 }).toArray();

const ids = targets.map((u) => u._id);
const idStrings = ids.map(String);
const names = targets.map((u) => u.username);
const externalIds = new Set();
targets.forEach((u) => ((u.library && u.library.lists) || []).forEach((l) => l.externalId && externalIds.add(l.externalId)));
db.list_versions.find({ ownerId: { $in: ids } }, { externalId: 1 }).forEach((v) => externalIds.add(v.externalId));
db.public_lists.find({ ownerId: { $in: ids } }, { externalId: 1 }).forEach((v) => externalIds.add(v.externalId));
const ex = [...externalIds];

const plan = [
  ['list_versions', db.list_versions, { ownerId: { $in: ids } }],
  ['public_lists', db.public_lists, { ownerId: { $in: ids } }],
  ['public_list_stats', db.public_list_stats, { externalId: { $in: ex } }],
  ['public_list_viewers', db.public_list_viewers, { externalId: { $in: ex } }],
  ['list_copies', db.list_copies, { $or: [{ userId: { $in: idStrings } }, { externalId: { $in: ex } }] }],
  ['follows', db.follows, { $or: [{ followerId: { $in: ids } }, { followedId: { $in: ids } }] }],
  ['feed_events', db.feed_events, { userId: { $in: ids } }],
  ['notifications', db.notifications, { $or: [{ userId: { $in: ids } }, { actorUsername: { $in: names } }] }],
  ['reports', db.reports, { $or: [
    { reporterId: { $in: ids } },
    { targetType: 'user', targetId: { $in: names } },
    { targetType: 'list', targetId: { $in: ex } },
  ] }],
  ['users', db.users, { _id: { $in: ids } }],
];

print(DRY ? 'DRY RUN' : 'DELETING', '- accounts targeted:', targets.length, '- lists:', ex.length);
print('kept accounts present:', db.users.countDocuments({ username: { $in: KEEP } }));
plan.forEach(([name, coll, filter]) => {
  const n = coll.countDocuments(filter);
  if (DRY) print(name.padEnd(20), n, '/', coll.countDocuments());
  else {
    const r = coll.deleteMany(filter);
    print(name.padEnd(20), 'deleted', r.deletedCount, '- left', coll.countDocuments());
  }
});
if (!DRY) print('left users:', db.users.find({}, { username: 1 }).toArray().map((u) => u.username).join(', '));
