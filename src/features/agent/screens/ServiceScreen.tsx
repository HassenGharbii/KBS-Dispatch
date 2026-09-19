import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
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
import { colors, spacing, radius, typography, cardShadow } from '../../../theme';

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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!shift) {
    return (
      <View style={styles.centered}>
        <OfflineBanner />
        <View style={styles.emptyIconCircle}>
          <Feather name="shield-off" size={30} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>Vous n'êtes pas en service</Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('SitePicker')}>
          <Feather name="play" size={17} color={colors.textOnPrimary} />
          <Text style={styles.primaryButtonText}>Prendre le service</Text>
        </Pressable>
        <Pressable style={styles.signOutLink} onPress={() => signOut()}>
          <Feather name="log-out" size={14} color={colors.textSecondary} />
          <Text style={styles.signOutLinkText}>Se déconnecter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <SyncStatusBadge />
      <View style={styles.header}>
        <View style={styles.headerIconCircle}>
          <Feather name="map-pin" size={18} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.siteName}>{siteQuery.data?.name ?? '…'}</Text>
          <View style={styles.elapsedRow}>
            <Feather name="clock" size={13} color={colors.textSecondary} />
            <Text style={styles.elapsed}>En service depuis {elapsed}</Text>
          </View>
        </View>
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
        ListEmptyComponent={
          <View style={styles.emptyEventsBox}>
            <Feather name="file-text" size={26} color={colors.textMuted} />
            <Text style={styles.emptyEvents}>Aucun événement pour l'instant.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
      <View style={styles.footer}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('EventEntry', { shiftId: shift.id })}
        >
          <Feather name="plus" size={17} color={colors.textOnPrimary} />
          <Text style={styles.primaryButtonText}>Ajouter un événement</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleEndShift} disabled={ending}>
          {ending ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <>
              <Feather name="square" size={16} color={colors.danger} />
              <Text style={styles.secondaryButtonText}>Terminer le service</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...cardShadow,
  },
  emptyTitle: { ...typography.heading, color: colors.textPrimary },
  signOutLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  signOutLinkText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  siteName: { ...typography.heading, color: colors.textPrimary },
  elapsedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  elapsed: { fontSize: 13, color: colors.textSecondary },
  list: { padding: spacing.lg, flexGrow: 1 },
  emptyEventsBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyEvents: { color: colors.textMuted, fontStyle: 'italic' },
  footer: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.background },
  primaryButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  primaryButtonText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
});
