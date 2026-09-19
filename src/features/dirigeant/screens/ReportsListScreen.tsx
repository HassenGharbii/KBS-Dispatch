import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DirigeantStackParamList } from '../../../navigation/DirigeantStack';
import { supabase } from '../../../lib/supabase';
import type { ShiftReport } from '../../../types/domain';
import { colors, spacing, radius, cardShadow } from '../../../theme';

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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={reportsQuery.data ?? []}
      keyExtractor={(item) => item.shiftId}
      onRefresh={() => reportsQuery.refetch()}
      refreshing={reportsQuery.isRefetching}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('ReportDetail', { shiftId: item.shiftId })}
        >
          <View style={styles.rowIconCircle}>
            <Feather name="file-text" size={16} color={colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <View style={styles.rowTitleRow}>
              <Text style={styles.agentName}>{item.agentName}</Text>
              {item.status === 'open' && (
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeText}>En cours</Text>
                </View>
              )}
            </View>
            <View style={styles.siteRow}>
              <Feather name="map-pin" size={12} color={colors.textSecondary} />
              <Text style={styles.siteName}>{item.siteName}</Text>
            </View>
            <Text style={styles.meta}>
              {formatDateTime(item.startAt)} · {item.eventCount} événement(s) · {item.photoCount} photo(s)
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Feather name="inbox" size={24} color={colors.textMuted} />
          <Text style={styles.empty}>Aucun compte rendu pour le moment.</Text>
        </View>
      }
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  list: { padding: spacing.lg },
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
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  agentName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  siteName: { fontSize: 13, color: colors.textSecondary },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  openBadge: { backgroundColor: colors.successLight, borderRadius: radius.full, paddingVertical: 2, paddingHorizontal: spacing.sm },
  openBadgeText: { fontSize: 11, color: colors.success, fontWeight: '700' },
  empty: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  emptyBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
});
