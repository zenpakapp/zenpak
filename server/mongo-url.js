// databaseUrl is either the legacy "host/dbname" (the app adds mongodb://) or a full connection
// string, as a managed MongoDB gives it (mongodb://… or mongodb+srv://…, with options after "?").
const FULL_URI = /^mongodb(\+srv)?:\/\//;

function parseDatabaseUrl(value) {
    const raw = String(value || '');
    if (!FULL_URI.test(raw)) {
        return { url: `mongodb://${raw}`, dbName: raw.split('/').pop() };
    }
    // Credentials may contain a "/" only when percent-encoded, so the first "/" after "//" opens the path.
    const afterScheme = raw.replace(FULL_URI, '');
    const path = afterScheme.includes('/') ? afterScheme.slice(afterScheme.indexOf('/') + 1) : '';
    const dbName = decodeURIComponent(path.split('?')[0]);
    // Without a name the driver would silently use its default database ("test").
    if (!dbName) throw new Error('databaseUrl has no database name: end the connection string with /<name>');
    return { url: raw, dbName };
}

module.exports = { parseDatabaseUrl };
