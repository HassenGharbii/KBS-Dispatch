import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import type { HistoryStackParamList } from '../../../navigation/AgentStack';
import { useAuthStore } from '../../../store/useAuthStore';
import { listShiftsForAgent, getMonthlyStatsForAgent } from '../../../db/repositories/shiftsRepo';
import { getSiteById } from '../../../db/repositories/sitesRepo';
import { AgentMonthlyStatsCard } from '../../../components/AgentMonthlyStatsCard';
import { colors, spacing, radius, typography, cardShadow } from '../../../theme';

type Props = NativeStackScreenProps<HistoryStackParamList, 'ShiftHistory'>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface ShiftRowProps {
  siteId: string;
  startAt: string;
  syncStatus: string;
  onPress: () => void;
}

function ShiftRow({ siteId, startAt, syncStatus, onPress }: ShiftRowProps) {
  const siteQuery = useQuery({ queryKey: ['site', siteId], queryFn: () => getSiteById(siteId) });
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowIconCircle}>
        <Feather name="check" size={15} color={colors.success} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.site}>{siteQuery.data?.name ?? '…'}</Text>
        <Text style={styles.date}>{formatDate(startAt)}</Text>
        {syncStatus !== 'synced' && (
          <View style={styles.pendingRow}>
            <Feather name="clock" size={11} color={colors.warning} />
            <Text style={styles.pending}>Non synchronisé</Text>
          </View>
        )}
      </View>
      <Feather name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function ShiftHistoryScreen({ navigation }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const agentId = profile?.id ?? '';
  const now = React.useState(() => new Date())[0];
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const shiftsQuery = useQuery({
    queryKey: ['shiftHistory', agentId],
    queryFn: () => listShiftsForAgent(agentId),
    enabled: Boolean(agentId),
  });

  const statsQuery = useQuery({
    queryKey: ['monthlyStats', agentId, year, month],
    queryFn: () => getMonthlyStatsForAgent(agentId, year, month),
    enabled: Boolean(agentId),
  });

  useFocusEffect(
    React.useCallback(() => {
      shiftsQuery.refetch();
      statsQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const shifts = (shiftsQuery.data ?? []).filter((s) => s.status === 'closed');

  if (shiftsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={shifts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ShiftRow
          siteId={item.siteId}
          startAt={item.startAt}
          syncStatus={item.syncStatus}
          onPress={() => navigation.navigate('ShiftSummary', { shiftId: item.id })}
        />
      )}
      ListHeaderComponent={
        <>
          {statsQuery.data ? <AgentMonthlyStatsCard stats={statsQuery.data} /> : null}
          <Pressable style={styles.linkRow} onPress={() => navigation.navigate('HomeAddress')}>
            <View style={styles.linkIconCircle}>
              <Feather name="home" size={16} color={colors.primary} />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkLabel}>Mon adresse de domicile</Text>
              <Text style={styles.linkValue}>{profile?.homeAddress ?? 'Non renseignée'}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => navigation.navigate('Unavailability')}>
            <View style={styles.linkIconCircle}>
              <Feather name="calendar" size={16} color={colors.primary} />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkLabel}>Mes indisponibilités</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
          {shifts.length > 0 && <Text style={styles.sectionTitle}>Historique</Text>}
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Feather name="archive" size={26} color={colors.textMuted} />
          <Text style={styles.empty}>Aucun service terminé.</Text>
        </View>
      }
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  list: { padding: spacing.lg },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
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
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  site: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  pending: { fontSize: 11, color: colors.warning, fontWeight: '600' },
  empty: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  emptyBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  linkIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkContent: { flex: 1 },
  linkLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  linkValue: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
});
