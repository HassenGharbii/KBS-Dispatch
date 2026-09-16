import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('kbs-main-courante.db').then(async (db) => {
      // busy_timeout is per-connection, not persisted like journal_mode, so it
      // must be set on every open — without it, a writer contending with the
      // sync engine's own writes gets an immediate SQLITE_BUSY instead of
      // waiting briefly, which surfaced as an unhandled rejection that
      // permanently stuck a UI action mid-flight (no retry, no error shown).
      await db.execAsync('PRAGMA busy_timeout = 5000;');
      return db;
    });
  }
  return dbPromise;
}
