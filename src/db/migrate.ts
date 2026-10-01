import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb } from './index';

export async function runMigrations(url?: string) {
  const { db, pool } = createDb(url);
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  await pool.end();
}

if (require.main === module) {
  runMigrations()
    .then(() => console.log('✔ Migrations applied'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
