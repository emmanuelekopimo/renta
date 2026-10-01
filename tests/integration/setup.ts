import { createDb } from '@/db';
import { runMigrations } from '@/db/migrate';
import { seed } from '@/db/seed';

export const TEST_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://renta:renta@localhost:5432/renta_test';
export const TODAY = '2026-10-14';

/** Fresh, migrated and seeded test database. */
export async function freshDb() {
  await runMigrations(TEST_URL);
  const { db, pool } = createDb(TEST_URL);
  const { landlordId } = await seed(db, TODAY);
  return { db, pool, landlordId };
}
