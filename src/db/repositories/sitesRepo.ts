import { getDb } from '../client';
import type { Site } from '../../types/domain';

interface SiteRow {
  id: string;
  name: string;
  address: string;
  sensitivity_level: number;
  client_name: string | null;
  is_active: number;
  lat: number | null;
  lng: number | null;
  cached_at: string;
}

function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    sensitivityLevel: row.sensitivity_level as 1 | 2 | 3,
    clientName: row.client_name,
    isActive: row.is_active === 1,
    lat: row.lat,
    lng: row.lng,
  };
}

export async function listActiveSites(): Promise<Site[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SiteRow>(
    'SELECT * FROM sites WHERE is_active = 1 ORDER BY name ASC'
  );
  return rows.map(toSite);
}

export async function getSiteById(id: string): Promise<Site | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SiteRow>('SELECT * FROM sites WHERE id = ?', [id]);
  return row ? toSite(row) : null;
}

/** Wholesale replace of the local sites cache, called after pulling from Supabase. */
export async function replaceSitesCache(sites: Site[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM sites');
    for (const site of sites) {
      await db.runAsync(
        `INSERT INTO sites (id, name, address, sensitivity_level, client_name, is_active, lat, lng, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          site.id,
          site.name,
          site.address,
          site.sensitivityLevel,
          site.clientName,
          site.isActive ? 1 : 0,
          site.lat,
          site.lng,
          now,
        ]
      );
    }
  });
}
