import { sql as m0001 } from './0001_init';
import { sql as m0002 } from './0002_sites_cache';
import { sql as m0003 } from './0003_shifts';
import { sql as m0004 } from './0004_events';
import { sql as m0005 } from './0005_photos';
import { sql as m0006 } from './0006_missions_link';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

// Order matters; version is the target PRAGMA user_version after applying.
export const MIGRATIONS: Migration[] = [
  { version: 1, name: 'init', sql: m0001 },
  { version: 2, name: 'sites_cache', sql: m0002 },
  { version: 3, name: 'shifts', sql: m0003 },
  { version: 4, name: 'events', sql: m0004 },
  { version: 5, name: 'photos', sql: m0005 },
  { version: 6, name: 'missions_link', sql: m0006 },
];
