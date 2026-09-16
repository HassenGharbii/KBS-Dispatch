import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { HistoryStackParamList } from '../../../navigation/AgentStack';
import { useAuthStore } from '../../../store/useAuthStore';
import { listShiftsForAgent, getMonthlyStatsForAgent } from '../../../db/repositories/shiftsRepo';
import { getSiteById } from '../../../db/repositories/sitesRepo';
import { AgentMonthlyStatsCard } from '../../../components/AgentMonthlyStatsCard';

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
      <Text style={styles.date}>{formatDate(startAt)}</Text>
      <Text style={styles.site}>{siteQuery.data?.name ?? '…'}</Text>
      {syncStatus !== 'synced' && <Text style={styles.pending}>Non synchronisé</Text>}
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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
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
          <Pressable style={styles.homeAddressRow} onPress={() => navigation.navigate('HomeAddress')}>
            <Text style={styles.homeAddressLabel}>Mon adresse de domicile</Text>
            <Text style={styles.homeAddressValue}>{profile?.homeAddress ?? 'Non renseignée'}</Text>
          </Pressable>
        </>
      }
      ListEmptyComponent={<Text style={styles.empty}>Aucun service terminé.</Text>}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  date: { fontSize: 13, color: '#6b7280' },
  site: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  pending: { fontSize: 11, color: '#b45309', marginTop: 2 },
  empty: { color: '#6b7280', fontStyle: 'italic', marginTop: 24, textAlign: 'center' },
  homeAddressRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 4,
  },
  homeAddressLabel: { fontSize: 14, fontWeight: '600', color: '#1d4ed8' },
  homeAddressValue: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
