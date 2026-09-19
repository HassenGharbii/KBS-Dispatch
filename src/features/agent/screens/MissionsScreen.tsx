import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, typography, cardShadow } from '../../../theme';
import { useAuthStore } from '../../../store/useAuthStore';
import { useMissionTrackingStore } from '../../../store/useMissionTrackingStore';
import { supabase } from '../../../lib/supabase';
import {
  listMissionsForAgent,
  listBroadcastMissions,
  claimBroadcastMission,
  respondToMission,
  cancelMission,
  startMissionProgress,
  type MissionWithNames,
} from '../../../lib/missionsApi';
import { scheduleMissionReminders, cancelMissionReminders } from '../../../lib/localNotifications';
import { openNavigation } from '../../../lib/routing';
import { startShift } from '../../../db/repositories/shiftsRepo';
import { beginLocationFix, withTimeout } from '../../../lib/location';
import { runSync, refreshPendingCount } from '../../../sync/syncEngine';
import {
  createSwapRequest,
  listSwapRequestsForAgent,
  respondToSwapRequest,
  type MissionSwapRequestWithNames,
} from '../../../lib/swapApi';
import { ColleaguePickerModal } from '../../../components/ColleaguePickerModal';
import type { MissionStatus } from '../../../types/domain';

const UPCOMING_STATUSES: MissionStatus[] = ['proposed', 'accepted', 'en_route', 'in_progress'];
// Mirrors the server-side enforce_agent_cancel_window trigger -- this is
// just to avoid a confusing rejected-request round trip; the DB trigger is
// the real enforcement.
const CANCEL_WINDOW_MS = 4 * 60 * 60 * 1000;

const STATUS_LABELS: Record<MissionStatus, string> = {
  proposed: 'Proposée',
  accepted: 'Acceptée',
  refused: 'Refusée',
  cancelled: 'Annulée',
  en_route: 'En route',
  in_progress: 'En cours',
  completed: 'Terminée',
};

// Matches the STATUS_COLORS convention already established on the web
// console's missions-list.tsx and planning calendar -- same statuses, same
// hues, so the two clients read as one product.
const STATUS_PILL_STYLES: Record<MissionStatus, { bg: string; fg: string }> = {
  proposed: { bg: '#fef3c7', fg: '#b45309' },
  accepted: { bg: colors.primaryLight, fg: colors.primary },
  refused: { bg: colors.dangerLight, fg: colors.danger },
  cancelled: { bg: '#f1f5f9', fg: colors.textMuted },
  en_route: { bg: colors.purpleLight, fg: colors.purple },
  in_progress: { bg: colors.successLight, fg: colors.success },
  completed: { bg: '#f1f5f9', fg: colors.textSecondary },
};

function StatusPill({ status }: { status: MissionStatus }) {
  const style = STATUS_PILL_STYLES[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: style.bg }]}>
      <Text style={[styles.statusPillText, { color: style.fg }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MissionCard({
  mission,
  outgoingSwapRequest,
  onChanged,
}: {
  mission: MissionWithNames;
  outgoingSwapRequest?: MissionSwapRequestWithNames | null;
  onChanged: () => void;
}) {
  const profile = useAuthStore((s) => s.profile);
  const navigation = useNavigation();
  const startTracking = useMissionTrackingStore((s) => s.start);
  const stopTracking = useMissionTrackingStore((s) => s.stop);
  const [busy, setBusy] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);

  async function handleOfferSwap(colleagueId: string) {
    if (!profile) return;
    setSwapModalVisible(false);
    setBusy(true);
    try {
      const { error } = await createSwapRequest(mission.id, profile.id, colleagueId);
      if (error) {
        Alert.alert('Erreur', error);
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleNavigate() {
    if (mission.siteLat == null || mission.siteLng == null) {
      Alert.alert('Site sans coordonnées', "Ce site n'a pas encore d'adresse géolocalisée.");
      return;
    }
    startTracking(mission.id);
    await openNavigation(mission.siteLat, mission.siteLng, mission.siteName);
  }

  async function handleStartShift() {
    if (!profile) return;
    setBusy(true);
    try {
      const fixPromise = beginLocationFix();
      const fix = await withTimeout(fixPromise, 8000);

      const shift = await startShift({
        agentId: profile.id,
        siteId: mission.siteId,
        missionId: mission.id,
        startLat: fix?.lat ?? null,
        startLng: fix?.lng ?? null,
        startAccuracy: fix?.accuracy ?? null,
      });
      void shift;

      stopTracking();
      await cancelMissionReminders(mission.id);
      const { error } = await startMissionProgress(mission.id);
      if (error) {
        Alert.alert('Erreur', error);
        return;
      }

      await refreshPendingCount();
      runSync();
      onChanged();
      // Cross-tab navigation: the mission lives under the Missions tab,
      // the shift lives under Service -- jump the agent there since that's
      // where they now need to be (event entry, end-of-shift, etc.).
      navigation.getParent()?.navigate('ServiceTab' as never);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Erreur', `Impossible de prendre le service. Réessayez.\n${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function respond(status: 'accepted' | 'refused') {
    setBusy(true);
    try {
      const { error } = await respondToMission(mission.id, status);
      if (error) {
        Alert.alert('Erreur', error);
        return;
      }
      if (status === 'accepted') {
        if (profile?.homeLat != null && profile.homeLng != null && mission.siteLat != null && mission.siteLng != null) {
          await scheduleMissionReminders({
            missionId: mission.id,
            siteName: mission.siteName,
            instructions: mission.instructions,
            scheduledStart: mission.scheduledStart,
            home: { lat: profile.homeLat, lng: profile.homeLng },
            site: { lat: mission.siteLat, lng: mission.siteLng },
          });
        } else {
          Alert.alert(
            'Adresse de domicile manquante',
            "Renseignez votre adresse dans Historique > Mon adresse de domicile pour recevoir le rappel de départ."
          );
        }
      } else {
        await cancelMissionReminders(mission.id);
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  function confirmCancel() {
    Alert.alert('Annuler la mission ?', 'Le dirigeant sera informé pour réaffectation.', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const { error } = await cancelMission(mission.id);
            if (error) {
              Alert.alert('Erreur', error);
              return;
            }
            await cancelMissionReminders(mission.id);
            onChanged();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  const canCancel = new Date(mission.scheduledStart).getTime() - Date.now() >= CANCEL_WINDOW_MS;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Feather name="map-pin" size={15} color={colors.textSecondary} />
          <Text style={styles.siteName}>{mission.siteName}</Text>
        </View>
        <StatusPill status={mission.status} />
      </View>
      <View style={styles.metaRow}>
        <Feather name="clock" size={13} color={colors.textSecondary} />
        <Text style={styles.meta}>{formatDateTime(mission.scheduledStart)}</Text>
      </View>
      {mission.instructions ? <Text style={styles.instructions}>{mission.instructions}</Text> : null}

      {busy ? (
        <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} />
      ) : (
        <View style={styles.actions}>
          {mission.status === 'proposed' && (
            <>
              <Pressable style={styles.acceptButton} onPress={() => respond('accepted')}>
                <Feather name="check" size={15} color={colors.textOnPrimary} />
                <Text style={styles.acceptButtonText}>Accepter</Text>
              </Pressable>
              <Pressable style={styles.refuseButton} onPress={() => respond('refused')}>
                <Feather name="x" size={15} color={colors.danger} />
                <Text style={styles.refuseButtonText}>Refuser</Text>
              </Pressable>
            </>
          )}
          {(mission.status === 'accepted' || mission.status === 'en_route') && (
            <>
              <Pressable style={styles.acceptButton} onPress={handleStartShift}>
                <Feather name="play" size={15} color={colors.textOnPrimary} />
                <Text style={styles.acceptButtonText}>Prendre le service</Text>
              </Pressable>
              <Pressable style={styles.navigateButton} onPress={handleNavigate}>
                <Feather name="navigation" size={15} color={colors.textOnPrimary} />
                <Text style={styles.navigateButtonText}>Naviguer</Text>
              </Pressable>
              {canCancel ? (
                <Pressable style={styles.refuseButton} onPress={confirmCancel}>
                  <Feather name="x-circle" size={15} color={colors.danger} />
                  <Text style={styles.refuseButtonText}>Annuler</Text>
                </Pressable>
              ) : (
                <View style={styles.cancelDisabledRow}>
                  <Feather name="lock" size={12} color={colors.textMuted} />
                  <Text style={styles.cancelDisabledText}>
                    Annulation impossible à moins de 4h du début
                  </Text>
                </View>
              )}
              {outgoingSwapRequest ? (
                <View style={styles.swapPendingRow}>
                  <Feather name="clock" size={12} color={colors.purple} />
                  <Text style={styles.swapPendingText}>
                    En attente de réponse de {outgoingSwapRequest.toAgentName}
                  </Text>
                </View>
              ) : (
                <Pressable style={styles.swapButton} onPress={() => setSwapModalVisible(true)}>
                  <Feather name="repeat" size={15} color={colors.purple} />
                  <Text style={styles.swapButtonText}>Céder à un collègue</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}

      <ColleaguePickerModal
        visible={swapModalVisible}
        onClose={() => setSwapModalVisible(false)}
        onSelect={handleOfferSwap}
      />
    </View>
  );
}

function BroadcastMissionCard({
  mission,
  onChanged,
}: {
  mission: MissionWithNames;
  onChanged: () => void;
}) {
  const profile = useAuthStore((s) => s.profile);
  const [busy, setBusy] = useState(false);

  async function handleClaim() {
    if (!profile) return;
    setBusy(true);
    try {
      const { error, alreadyClaimed } = await claimBroadcastMission(mission.id, profile.id);
      if (alreadyClaimed) {
        Alert.alert('Mission déjà prise', 'Cette mission vient d\'être prise par un autre agent.');
        onChanged();
        return;
      }
      if (error) {
        Alert.alert('Erreur', error);
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Feather name="map-pin" size={15} color={colors.textSecondary} />
          <Text style={styles.siteName}>{mission.siteName}</Text>
        </View>
        <View style={styles.broadcastPill}>
          <Feather name="radio" size={11} color={colors.purple} />
          <Text style={styles.broadcastPillText}>Diffusion</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Feather name="clock" size={13} color={colors.textSecondary} />
        <Text style={styles.meta}>{formatDateTime(mission.scheduledStart)}</Text>
      </View>
      {mission.instructions ? <Text style={styles.instructions}>{mission.instructions}</Text> : null}
      {busy ? (
        <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} />
      ) : (
        <View style={styles.actions}>
          <Pressable style={styles.acceptButton} onPress={handleClaim}>
            <Feather name="check" size={15} color={colors.textOnPrimary} />
            <Text style={styles.acceptButtonText}>Accepter</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function IncomingSwapRequestCard({
  request,
  onChanged,
}: {
  request: MissionSwapRequestWithNames;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function respond(status: 'accepted' | 'refused') {
    setBusy(true);
    try {
      const { error } = await respondToSwapRequest(request.id, status);
      if (error) {
        Alert.alert('Erreur', error);
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, styles.swapCard]}>
      <View style={styles.cardTitleRow}>
        <Feather name="repeat" size={15} color={colors.purple} />
        <Text style={styles.siteName}>{request.siteName}</Text>
      </View>
      <Text style={styles.meta}>
        {request.fromAgentName} vous propose sa mission
        {request.scheduledStart ? ` · ${formatDateTime(request.scheduledStart)}` : ''}
      </Text>
      {busy ? (
        <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} />
      ) : (
        <View style={styles.actions}>
          <Pressable style={styles.acceptButton} onPress={() => respond('accepted')}>
            <Feather name="check" size={15} color={colors.textOnPrimary} />
            <Text style={styles.acceptButtonText}>Accepter</Text>
          </Pressable>
          <Pressable style={styles.refuseButton} onPress={() => respond('refused')}>
            <Feather name="x" size={15} color={colors.danger} />
            <Text style={styles.refuseButtonText}>Refuser</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function MissionsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const agentId = profile?.id ?? '';
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'upcoming' | 'available'>('upcoming');

  const missionsQuery = useQuery({
    queryKey: ['missions', 'agent', agentId],
    queryFn: () => listMissionsForAgent(agentId),
    enabled: Boolean(agentId),
  });

  const broadcastQuery = useQuery({
    queryKey: ['missions', 'broadcast'],
    queryFn: listBroadcastMissions,
  });

  const swapRequestsQuery = useQuery({
    queryKey: ['swapRequests', agentId],
    queryFn: () => listSwapRequestsForAgent(agentId),
    enabled: Boolean(agentId),
  });

  useEffect(() => {
    if (!agentId) return;
    const channel = supabase
      .channel(`missions-agent-${agentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `agent_id=eq.${agentId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['missions', 'agent', agentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, queryClient]);

  useEffect(() => {
    // Unfiltered on is_broadcast (not agent_id, since an unclaimed row has
    // none) -- over-fetches slightly (also matches rows another agent just
    // claimed), harmless since the refetch's real SELECT re-applies the
    // RLS-backed "agent_id is null" condition.
    const channel = supabase
      .channel('missions-broadcast-org')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: 'is_broadcast=eq.true' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['missions', 'broadcast'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    if (!agentId) return;
    // Two channels (Realtime filters are single-column) so both directions
    // -- a request sent to me, and a response to one I sent -- invalidate.
    function invalidateSwapAndMissions() {
      queryClient.invalidateQueries({ queryKey: ['swapRequests', agentId] });
      // A swap acceptance also changes missions.agent_id on the "from"
      // side, which that agent's own agent_id=eq.<id> mission channel won't
      // catch (the row no longer matches their filter once reassigned).
      queryClient.invalidateQueries({ queryKey: ['missions', 'agent', agentId] });
    }
    const incoming = supabase
      .channel(`swap-requests-to-${agentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_swap_requests', filter: `to_agent_id=eq.${agentId}` },
        invalidateSwapAndMissions
      )
      .subscribe();
    const outgoing = supabase
      .channel(`swap-requests-from-${agentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_swap_requests', filter: `from_agent_id=eq.${agentId}` },
        invalidateSwapAndMissions
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incoming);
      supabase.removeChannel(outgoing);
    };
  }, [agentId, queryClient]);

  const missions = missionsQuery.data ?? [];
  const upcoming = missions
    .filter((m) => UPCOMING_STATUSES.includes(m.status))
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  const history = missions
    .filter((m) => !UPCOMING_STATUSES.includes(m.status))
    .sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart));
  const available = broadcastQuery.data ?? [];

  const swapRequests = swapRequestsQuery.data ?? [];
  const incomingSwapRequests = swapRequests.filter(
    (r) => r.toAgentId === agentId && r.status === 'requested'
  );
  const outgoingSwapByMission = new Map(
    swapRequests
      .filter((r) => r.fromAgentId === agentId && r.status === 'requested')
      .map((r) => [r.missionId, r])
  );

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ['missions', 'agent', agentId] });
    queryClient.invalidateQueries({ queryKey: ['missions', 'broadcast'] });
    queryClient.invalidateQueries({ queryKey: ['swapRequests', agentId] });
  }

  if (missionsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {incomingSwapRequests.length > 0 && (
        <View style={styles.incomingSection}>
          <Text style={styles.sectionTitle}>Demandes reçues</Text>
          {incomingSwapRequests.map((r) => (
            <IncomingSwapRequestCard key={r.id} request={r} onChanged={refetch} />
          ))}
        </View>
      )}

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, tab === 'upcoming' && styles.tabButtonActive]}
          onPress={() => setTab('upcoming')}
        >
          <Feather
            name="calendar"
            size={15}
            color={tab === 'upcoming' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text style={[styles.tabButtonText, tab === 'upcoming' && styles.tabButtonTextActive]}>
            À venir
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, tab === 'available' && styles.tabButtonActive]}
          onPress={() => setTab('available')}
        >
          <Feather
            name="radio"
            size={15}
            color={tab === 'available' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text style={[styles.tabButtonText, tab === 'available' && styles.tabButtonTextActive]}>
            Disponibles{available.length > 0 ? ` (${available.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {tab === 'upcoming' ? (
        <FlatList
          data={[...upcoming, ...history]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MissionCard
              mission={item}
              outgoingSwapRequest={outgoingSwapByMission.get(item.id) ?? null}
              onChanged={refetch}
            />
          )}
          ListHeaderComponent={
            upcoming.length > 0 ? <Text style={styles.sectionTitle}>À venir</Text> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="clipboard" size={26} color={colors.textMuted} />
              <Text style={styles.empty}>Aucune mission pour le moment.</Text>
            </View>
          }
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={available}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BroadcastMissionCard mission={item} onChanged={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="radio" size={26} color={colors.textMuted} />
              <Text style={styles.empty}>Aucune mission disponible actuellement.</Text>
            </View>
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  incomingSection: { padding: spacing.lg, paddingBottom: 0 },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: 0,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabButtonTextActive: { color: colors.textOnPrimary },
  cancelDisabledRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'center' },
  cancelDisabledText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  list: { padding: spacing.lg },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...cardShadow,
  },
  swapCard: { backgroundColor: colors.purpleLight },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  statusPill: { borderRadius: radius.full, paddingVertical: 3, paddingHorizontal: spacing.sm },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  broadcastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.purpleLight,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  broadcastPillText: { fontSize: 11, fontWeight: '700', color: colors.purple },
  siteName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  meta: { fontSize: 13, color: colors.textSecondary },
  instructions: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  acceptButton: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  acceptButtonText: { color: colors.textOnPrimary, fontWeight: '600' },
  refuseButton: {
    flexDirection: 'row',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  refuseButtonText: { color: colors.danger, fontWeight: '600' },
  navigateButton: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  navigateButtonText: { color: colors.textOnPrimary, fontWeight: '600' },
  swapButton: {
    flexDirection: 'row',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.purple,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  swapButtonText: { color: colors.purple, fontWeight: '600' },
  swapPendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'center' },
  swapPendingText: {
    fontSize: 12,
    color: colors.purple,
    fontStyle: 'italic',
  },
  emptyBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl },
  empty: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
});
