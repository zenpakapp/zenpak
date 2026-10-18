// Read-only: counts the list descriptions (and summaries) longer than the public limit, which
// saving a library now cuts (server/text-limits.js). Run it against a database before relying on
// that cut, to know how many existing texts would be shortened at their next save:
//   NODE_ENV=production node scripts/count-long-descriptions.js
const db = require('../server/db.js');
const { PUBLIC_DESCRIPTION_MAX_LENGTH } = require('../server/text-limits.js');

const TOP = 10;

async function run() {
    await db.ready;
    const users = await db.users.findMany({}, { projection: { username: 1, 'library.lists': 1 } });

    let lists = 0;
    const tooLong = [];
    users.forEach((user) => {
        ((user.library && user.library.lists) || []).forEach((list) => {
            lists += 1;
            ['description', 'summary'].forEach((field) => {
                const length = typeof list[field] === 'string' ? list[field].length : 0;
                if (length > PUBLIC_DESCRIPTION_MAX_LENGTH) {
                    tooLong.push({
                        user: user.username, list: list.name, field, length,
                    });
                }
            });
        });
    });

    tooLong.sort((a, b) => b.length - a.length);
    console.log(`${users.length} users, ${lists} lists, ${tooLong.length} texts over ${PUBLIC_DESCRIPTION_MAX_LENGTH} characters.`);
    tooLong.slice(0, TOP).forEach((row) => {
        console.log(`  ${row.length}  ${row.field}  ${row.user} / ${row.list}`);
    });
}

run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
