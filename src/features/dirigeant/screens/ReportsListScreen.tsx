import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DirigeantStackParamList } from '../../../navigation/DirigeantStack';
import { supabase } from '../../../lib/supabase';
import type { ShiftReport } from '../../../types/domain';

type Props = NativeStackScreenProps<DirigeantStackParamList, 'ReportsList'>;

interface ShiftReportRow {
  shift_id: string;
  agent_id: string;
  agent_name: string;
  site_id: string;
  site_name: string;
  status: 'open' | 'closed';
  start_at: string;
  end_at: string | null;
  event_count: number;
  photo_count: number;
}

function toShiftReport(row: ShiftReportRow): ShiftReport {
  return {
    shiftId: row.shift_id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    siteId: row.site_id,
    siteName: row.site_name,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    eventCount: row.event_count,
    photoCount: row.photo_count,
  };
}

async function fetchShiftReports(): Promise<ShiftReport[]> {
  const { data, error } = await supabase
    .from('shift_reports')
    .select('*')
    .order('start_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return (data as ShiftReportRow[]).map(toShiftReport);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ReportsListScreen({ navigation }: Props) {
  const reportsQuery = useQuery({ queryKey: ['shiftReports'], queryFn: fetchShiftReports });

  if (reportsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={reportsQuery.data ?? []}
      keyExtractor={(item) => item.shiftId}
      onRefresh={() => reportsQuery.refetch()}
      refreshing={reportsQuery.isRefetching}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('ReportDetail', { shiftId: item.shiftId })}
        >
          <Text style={styles.agentName}>{item.agentName}</Text>
          <Text style={styles.siteName}>{item.siteName}</Text>
          <Text style={styles.meta}>
            {formatDateTime(item.startAt)} · {item.eventCount} événement(s) · {item.photoCount}{' '}
            photo(s)
          </Text>
          {item.status === 'open' && <Text style={styles.openBadge}>En cours</Text>}
        </Pressable>
      )}
      ListEmptyComponent={<Text style={styles.empty}>Aucun compte rendu pour le moment.</Text>}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  agentName: { fontSize: 16, fontWeight: '700' },
  siteName: { fontSize: 14, color: '#374151', marginTop: 2 },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  openBadge: { fontSize: 12, color: '#16a34a', marginTop: 4, fontWeight: '600' },
  empty: { color: '#6b7280', fontStyle: 'italic', marginTop: 24, textAlign: 'center' },
});
