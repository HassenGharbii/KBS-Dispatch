import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { appCache, CacheKeys } from '../lib/mmkv';
import type { Profile, UserRole } from '../types/domain';

interface ProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  professional_card_number: string | null;
  geoloc_consent_at: string | null;
  home_address: string | null;
  home_lat: number | null;
  home_lng: number | null;
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    professionalCardNumber: row.professional_card_number,
    geolocConsentAt: row.geoloc_consent_at,
    homeAddress: row.home_address,
    homeLat: row.home_lat,
    homeLng: row.home_lng,
  };
}

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  session: Session | null;
  profile: Profile | null;
  /** Mirrors profile.role into MMKV so cold start can pick a nav shell before the network round-trip resolves. */
  cachedRole: UserRole | null;
  init: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  recordGeolocConsent: () => Promise<void>;
  updateHomeAddress: (address: string, lat: number, lng: number) => Promise<{ error: string | null }>;
}

let initialized = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  session: null,
  profile: null,
  cachedRole: (appCache.getString(CacheKeys.cachedRole) as UserRole | undefined) ?? null,

  init: () => {
    if (initialized) return;
    initialized = true;

    // supabase-js fires this immediately with the existing session (or null)
    // on subscribe, so this single listener also covers the initial load.
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        set({ status: 'signedOut', session: null, profile: null });
        return;
      }
      set({ session });
      await get().refreshProfile();
      set({ status: 'signedIn' });
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    appCache.remove(CacheKeys.cachedRole);
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (error || !data) {
      set({ profile: null });
      return;
    }
    const profile = toProfile(data as ProfileRow);
    appCache.set(CacheKeys.cachedRole, profile.role);
    set({ profile, cachedRole: profile.role });
  },

  recordGeolocConsent: async () => {
    const profile = get().profile;
    if (!profile) return;
    const now = new Date().toISOString();
    await supabase.from('profiles').update({ geoloc_consent_at: now }).eq('id', profile.id);
    set({ profile: { ...profile, geolocConsentAt: now } });
  },

  updateHomeAddress: async (address, lat, lng) => {
    const profile = get().profile;
    if (!profile) return { error: 'Aucun profil chargé.' };
    const { error } = await supabase
      .from('profiles')
      .update({ home_address: address, home_lat: lat, home_lng: lng })
      .eq('id', profile.id);
    if (error) return { error: error.message };
    set({ profile: { ...profile, homeAddress: address, homeLat: lat, homeLng: lng } });
    return { error: null };
  },
}));
