import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../../store/useAuthStore';
import { useMissionTrackingStore } from '../../../store/useMissionTrackingStore';
import { supabase } from '../../../lib/supabase';
import {
  listMissionsForAgent,
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
import type { MissionStatus } from '../../../types/domain';

const UPCOMING_STATUSES: MissionStatus[] = ['proposed', 'accepted', 'en_route', 'in_progress'];

const STATUS_LABELS: Record<MissionStatus, string> = {
  proposed: 'Proposée',
  accepted: 'Acceptée',
  refused: 'Refusée',
  cancelled: 'Annulée',
  en_route: 'En route',
  in_progress: 'En cours',
  completed: 'Terminée',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MissionCard({ mission, onChanged }: { mission: MissionWithNames; onChanged: () => void }) {
  const profile = useAuthStore((s) => s.profile);
  const navigation = useNavigation();
  const startTracking = useMissionTrackingStore((s) => s.start);
  const stopTracking = useMissionTrackingStore((s) => s.stop);
  const [busy, setBusy] = useState(false);

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

  return (
    <View style={styles.card}>
      <Text style={styles.siteName}>{mission.siteName}</Text>
      <Text style={styles.meta}>
        {formatDateTime(mission.scheduledStart)} · {STATUS_LABELS[mission.status]}
      </Text>
      {mission.instructions ? <Text style={styles.instructions}>{mission.instructions}</Text> : null}

      {busy ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : (
        <View style={styles.actions}>
          {mission.status === 'proposed' && (
            <>
              <Pressable style={styles.acceptButton} onPress={() => respond('accepted')}>
                <Text style={styles.acceptButtonText}>Accepter</Text>
              </Pressable>
              <Pressable style={styles.refuseButton} onPress={() => respond('refused')}>
                <Text style={styles.refuseButtonText}>Refuser</Text>
              </Pressable>
            </>
          )}
          {(mission.status === 'accepted' || mission.status === 'en_route') && (
            <>
              <Pressable style={styles.acceptButton} onPress={handleStartShift}>
                <Text style={styles.acceptButtonText}>Prendre le service</Text>
              </Pressable>
              <Pressable style={styles.navigateButton} onPress={handleNavigate}>
                <Text style={styles.navigateButtonText}>Naviguer</Text>
              </Pressable>
              <Pressable style={styles.refuseButton} onPress={confirmCancel}>
                <Text style={styles.refuseButtonText}>Annuler</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function MissionsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const agentId = profile?.id ?? '';
  const queryClient = useQueryClient();

  const missionsQuery = useQuery({
    queryKey: ['missions', 'agent', agentId],
    queryFn: () => listMissionsForAgent(agentId),
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

  const missions = missionsQuery.data ?? [];
  const upcoming = missions
    .filter((m) => UPCOMING_STATUSES.includes(m.status))
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  const history = missions
    .filter((m) => !UPCOMING_STATUSES.includes(m.status))
    .sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart));

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ['missions', 'agent', agentId] });
  }

  if (missionsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={[...upcoming, ...history]}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MissionCard mission={item} onChanged={refetch} />}
      ListHeaderComponent={
        upcoming.length > 0 ? <Text style={styles.sectionTitle}>À venir</Text> : null
      }
      ListEmptyComponent={<Text style={styles.empty}>Aucune mission pour le moment.</Text>}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  siteName: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  instructions: { fontSize: 13, color: '#374151', marginTop: 8, fontStyle: 'italic' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  acceptButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  acceptButtonText: { color: '#fff', fontWeight: '600' },
  refuseButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  refuseButtonText: { color: '#dc2626', fontWeight: '600' },
  navigateButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  navigateButtonText: { color: '#fff', fontWeight: '600' },
  empty: { color: '#6b7280', fontStyle: 'italic', marginTop: 24, textAlign: 'center' },
});
