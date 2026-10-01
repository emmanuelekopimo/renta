import { createDb } from '../src/db';
import { runMigrations } from '../src/db/migrate';
import { seed } from '../src/db/seed';

export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://renta:renta@localhost:5432/renta_test';
  await runMigrations(url);
  const { db, pool } = createDb(url);
  await seed(db, '2026-10-14');
  await pool.end();
}
