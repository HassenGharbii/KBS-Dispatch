import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ServiceStackParamList } from '../../../navigation/AgentStack';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  getOpenShift,
  endShift,
  backfillShiftEndLocation,
} from '../../../db/repositories/shiftsRepo';
import { listEventsForShift } from '../../../db/repositories/eventsRepo';
import { getSiteById } from '../../../db/repositories/sitesRepo';
import { countPhotosForEvents } from '../../../db/repositories/photosRepo';
import { EventListItem } from '../../../components/EventListItem';
import { SyncStatusBadge } from '../../../components/SyncStatusBadge';
import { OfflineBanner } from '../../../components/OfflineBanner';
import { beginLocationFix, withTimeout } from '../../../lib/location';
import { runSync, refreshPendingCount } from '../../../sync/syncEngine';
import { completeMission } from '../../../lib/missionsApi';

type Props = NativeStackScreenProps<ServiceStackParamList, 'Service'>;

function useElapsed(startAt: string | undefined) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!startAt) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [startAt]);
  if (!startAt) return '';
  const ms = Date.now() - new Date(startAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h${minutes.toString().padStart(2, '0')}`;
}

export default function ServiceScreen({ navigation }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();
  const agentId = profile?.id ?? '';
  const [ending, setEnding] = useState(false);

  const shiftQuery = useQuery({
    queryKey: ['openShift', agentId],
    queryFn: () => getOpenShift(agentId),
    enabled: Boolean(agentId),
  });

  const shift = shiftQuery.data ?? null;

  const siteQuery = useQuery({
    queryKey: ['site', shift?.siteId],
    queryFn: () => getSiteById(shift!.siteId),
    enabled: Boolean(shift),
  });

  const eventsQuery = useQuery({
    queryKey: ['events', shift?.id],
    queryFn: () => listEventsForShift(shift!.id),
    enabled: Boolean(shift),
  });

  const events = eventsQuery.data ?? [];

  const photoCountsQuery = useQuery({
    queryKey: ['photoCounts', shift?.id, events.length],
    queryFn: () => countPhotosForEvents(events.map((e) => e.id)),
    enabled: events.length > 0,
  });
  const photoCounts = photoCountsQuery.data ?? {};

  const elapsed = useElapsed(shift?.startAt);

  useFocusEffect(
    React.useCallback(() => {
      shiftQuery.refetch();
      eventsQuery.refetch();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  async function handleEndShift() {
    if (!shift || ending) return;
    setEnding(true);
    try {
      const fixPromise = beginLocationFix();
      const fix = await withTimeout(fixPromise, 8000);
      await endShift(shift.id, fix?.lat ?? null, fix?.lng ?? null, fix?.accuracy ?? null);
      if (!fix) {
        fixPromise.then((lateFix) => {
          if (lateFix) backfillShiftEndLocation(shift.id, lateFix.lat, lateFix.lng, lateFix.accuracy);
        });
      }
      if (shift.missionId) {
        completeMission(shift.missionId);
      }
      await refreshPendingCount();
      runSync();
      queryClient.invalidateQueries({ queryKey: ['openShift', agentId] });
      navigation.navigate('ShiftSummary', { shiftId: shift.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Erreur', `Impossible de terminer le service. Réessayez.\n${message}`);
    } finally {
      setEnding(false);
    }
  }

  if (shiftQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!shift) {
    return (
      <View style={styles.centered}>
        <OfflineBanner />
        <Text style={styles.emptyTitle}>Vous n'êtes pas en service</Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('SitePicker')}>
          <Text style={styles.primaryButtonText}>Prendre le service</Text>
        </Pressable>
        <Pressable onPress={() => signOut()}>
          <Text style={styles.signOutLink}>Se déconnecter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <SyncStatusBadge />
      <View style={styles.header}>
        <Text style={styles.siteName}>{siteQuery.data?.name ?? '…'}</Text>
        <Text style={styles.elapsed}>En service depuis {elapsed}</Text>
      </View>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventListItem
            event={item}
            photoCount={photoCounts[item.id] ?? 0}
            onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyEvents}>Aucun événement pour l'instant.</Text>}
        contentContainerStyle={styles.list}
      />
      <View style={styles.footer}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('EventEntry', { shiftId: shift.id })}
        >
          <Text style={styles.primaryButtonText}>+ Ajouter un événement</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleEndShift} disabled={ending}>
          {ending ? (
            <ActivityIndicator color="#dc2626" />
          ) : (
            <Text style={styles.secondaryButtonText}>Terminer le service</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  signOutLink: { color: '#6b7280', fontSize: 14, marginTop: 8 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  siteName: { fontSize: 20, fontWeight: '700' },
  elapsed: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  emptyEvents: { color: '#6b7280', fontStyle: 'italic', paddingVertical: 24, textAlign: 'center' },
  footer: { padding: 16, gap: 10 },
  primaryButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#dc2626', fontWeight: '700', fontSize: 16 },
});
