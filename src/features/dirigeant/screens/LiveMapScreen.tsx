import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { LeafletMapView, type MapMarker } from '../../../components/LeafletMapView';
import { colors, spacing, radius, typography, cardShadow } from '../../../theme';

interface ActiveShift {
  shiftId: string;
  agentId: string;
  agentName: string;
  siteName: string;
  startAt: string;
  currentLat: number | null;
  currentLng: number | null;
}

interface ShiftRow {
  id: string;
  agent_id: string;
  status: string;
  start_at: string;
  start_lat: number | null;
  start_lng: number | null;
  current_lat: number | null;
  current_lng: number | null;
  profiles: { full_name: string } | null;
  sites: { name: string } | null;
}

interface EnRouteMission {
  missionId: string;
  agentId: string;
  agentName: string;
  siteName: string;
  currentLat: number | null;
  currentLng: number | null;
}

interface MissionRow {
  id: string;
  agent_id: string;
  status: string;
  current_lat: number | null;
  current_lng: number | null;
  agent: { full_name: string } | null;
  sites: { name: string } | null;
}

interface SiteRow {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function LiveMapScreen() {
  const [activeByAgent, setActiveByAgent] = useState<Map<string, ActiveShift>>(new Map());
  const [enRouteByAgent, setEnRouteByAgent] = useState<Map<string, EnRouteMission>>(new Map());
  const [sites, setSites] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);

  // One-shot: sites change rarely, so a realtime subscription isn't worth it
  // here (unlike shifts/missions, which are the whole point of this screen).
  useEffect(() => {
    let cancelled = false;
    async function loadSites() {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, lat, lng')
        .eq('is_active', true)
        .returns<SiteRow[]>();
      if (!cancelled && !error && data) {
        setSites(
          data
            .filter((s): s is SiteRow & { lat: number; lng: number } => s.lat != null && s.lng != null)
            .map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: s.name, kind: 'site' as const }))
        );
      }
    }
    loadSites();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function seed() {
      const { data, error } = await supabase
        .from('shifts')
        .select(
          'id, agent_id, status, start_at, start_lat, start_lng, current_lat, current_lng, profiles(full_name), sites(name)'
        )
        .eq('status', 'open')
        .returns<ShiftRow[]>();

      if (!cancelled && !error && data) {
        const next = new Map<string, ActiveShift>();
        for (const row of data) {
          next.set(row.agent_id, {
            shiftId: row.id,
            agentId: row.agent_id,
            agentName: row.profiles?.full_name ?? '—',
            siteName: row.sites?.name ?? '—',
            startAt: row.start_at,
            // Fall back to the clock-in fix: a live ping only lands once the
            // agent has moved distanceInterval meters (see liveLocationEngine),
            // so a stationary agent would otherwise never get a marker at all.
            currentLat: row.current_lat ?? row.start_lat,
            currentLng: row.current_lng ?? row.start_lng,
          });
        }
        setActiveByAgent(next);
      }
      if (!cancelled) setLoading(false);
    }
    seed();

    // Unfiltered subscription — a server-side `eq.open` filter would miss
    // the closing transition (filters evaluate post-change), which is
    // exactly the "pin never disappears on clock-out" footgun to avoid.
    const channel = supabase
      .channel('active-shifts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        (payload) => {
          const row = payload.new as Partial<ShiftRow> & { id?: string };
          if (!row || !row.agent_id) return;

          setActiveByAgent((prev) => {
            const next = new Map(prev);
            if (row.status === 'closed') {
              next.delete(row.agent_id!);
              return next;
            }
            if (row.status === 'open') {
              const existing = next.get(row.agent_id!);
              next.set(row.agent_id!, {
                shiftId: row.id ?? existing?.shiftId ?? '',
                agentId: row.agent_id!,
                agentName: existing?.agentName ?? '—',
                siteName: existing?.siteName ?? '—',
                startAt: row.start_at ?? existing?.startAt ?? new Date().toISOString(),
                currentLat: row.current_lat ?? existing?.currentLat ?? row.start_lat ?? null,
                currentLng: row.current_lng ?? existing?.currentLng ?? row.start_lng ?? null,
              });
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // Mirrors the shifts effect above, for the pre-shift commute window
  // (Phase 3): a mission in 'en_route' gets its own marker, distinct from
  // an on-shift agent, until clock-in flips it to 'in_progress' and shift
  // tracking (the effect above) takes over.
  useEffect(() => {
    let cancelled = false;

    async function seed() {
      const { data, error } = await supabase
        .from('missions')
        .select('id, agent_id, status, current_lat, current_lng, agent:profiles!missions_agent_id_fkey(full_name), sites(name)')
        .eq('status', 'en_route')
        .returns<MissionRow[]>();

      if (!cancelled && !error && data) {
        const next = new Map<string, EnRouteMission>();
        for (const row of data) {
          next.set(row.agent_id, {
            missionId: row.id,
            agentId: row.agent_id,
            agentName: row.agent?.full_name ?? '—',
            siteName: row.sites?.name ?? '—',
            currentLat: row.current_lat,
            currentLng: row.current_lng,
          });
        }
        setEnRouteByAgent(next);
      }
    }
    seed();

    const channel = supabase
      .channel('en-route-missions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions' },
        (payload) => {
          const row = payload.new as Partial<MissionRow> & { id?: string };
          if (!row || !row.agent_id) return;

          setEnRouteByAgent((prev) => {
            const next = new Map(prev);
            if (row.status !== 'en_route') {
              next.delete(row.agent_id!);
              return next;
            }
            const existing = next.get(row.agent_id!);
            next.set(row.agent_id!, {
              missionId: row.id ?? existing?.missionId ?? '',
              agentId: row.agent_id!,
              agentName: existing?.agentName ?? '—',
              siteName: existing?.siteName ?? '—',
              currentLat: row.current_lat ?? existing?.currentLat ?? null,
              currentLng: row.current_lng ?? existing?.currentLng ?? null,
            });
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const activeList = useMemo(() => Array.from(activeByAgent.values()), [activeByAgent]);
  const enRouteList = useMemo(() => Array.from(enRouteByAgent.values()), [enRouteByAgent]);

  const markers: MapMarker[] = useMemo(() => {
    const onShift: MapMarker[] = activeList
      .filter((s) => s.currentLat != null && s.currentLng != null)
      .map((s) => ({
        id: s.agentId,
        lat: s.currentLat as number,
        lng: s.currentLng as number,
        label: s.agentName,
        kind: 'on_shift',
      }));
    const enRoute: MapMarker[] = enRouteList
      .filter((m) => m.currentLat != null && m.currentLng != null && !activeByAgent.has(m.agentId))
      .map((m) => ({
        id: m.agentId,
        lat: m.currentLat as number,
        lng: m.currentLng as number,
        label: `${m.agentName} (en route)`,
        kind: 'en_route',
      }));
    return [...onShift, ...enRoute];
  }, [activeList, enRouteList, activeByAgent]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LeafletMapView markers={markers} siteMarkers={sites} style={styles.map} />
      <FlatList
        data={activeList}
        keyExtractor={(item) => item.agentId}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listTitleRow}>
            <Feather name="users" size={15} color={colors.textPrimary} />
            <Text style={styles.listTitle}>Agents actifs ({activeList.length})</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowIconCircle}>
              <Feather name="user" size={16} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.agentName}>{item.agentName}</Text>
              <View style={styles.metaRow}>
                <Feather name="map-pin" size={12} color={colors.textSecondary} />
                <Text style={styles.meta}>
                  {item.siteName} · depuis {formatTime(item.startAt)}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Feather name="user-x" size={22} color={colors.textMuted} />
            <Text style={styles.empty}>Aucun agent en service actuellement.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  map: { height: '45%' },
  list: { flex: 1 },
  listContent: { padding: spacing.lg },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  listTitle: { ...typography.label, color: colors.textPrimary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  agentName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontSize: 13, color: colors.textSecondary },
  empty: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  emptyBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
});
