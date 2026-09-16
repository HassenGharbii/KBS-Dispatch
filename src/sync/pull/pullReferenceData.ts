import { supabase } from '../../lib/supabase';
import { replaceSitesCache } from '../../db/repositories/sitesRepo';
import { appCache, CacheKeys } from '../../lib/mmkv';
import type { Site } from '../../types/domain';

interface SiteRow {
  id: string;
  name: string;
  address: string;
  sensitivity_level: number;
  client_name: string | null;
  is_active: boolean;
  lat: number | null;
  lng: number | null;
}

/** Pulls the active sites list. Own profile is refreshed separately by useAuthStore. */
export async function pullReferenceData(): Promise<void> {
  const { data, error } = await supabase.from('sites').select('*').eq('is_active', true);
  if (error || !data) return;

  const sites: Site[] = (data as SiteRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    sensitivityLevel: row.sensitivity_level as 1 | 2 | 3,
    clientName: row.client_name,
    isActive: row.is_active,
    lat: row.lat,
    lng: row.lng,
  }));

  await replaceSitesCache(sites);
  appCache.set(CacheKeys.lastReferenceDataPullAt, new Date().toISOString());
}
