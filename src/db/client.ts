import 'server-only';
import { createDb, type Db } from './index';

const globalForDb = globalThis as unknown as { rentaDb?: Db };

/** One pooled connection per server process (survives dev hot reloads). */
export function getDb(): Db {
  if (!globalForDb.rentaDb) globalForDb.rentaDb = createDb().db;
  return globalForDb.rentaDb;
}
