import { getDb } from './client';
import { MIGRATIONS } from './migrations';

export async function runMigrations(): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version
  );

  for (const migration of pending) {
    await db.execAsync(migration.sql);
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
  }
}
