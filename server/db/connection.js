import { createClient } from '@libsql/client';

// For local development, use a local SQLite file
// For production, use Turso cloud database
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:server/db/minijira.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default db;
