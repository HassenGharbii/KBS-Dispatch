import React, { useMemo } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { colors, spacing, radius, cardShadow } from '../../../theme';

interface HoursSummaryRow {
  agent_id: string;
  agent_name: string;
  site_id: string;
  site_name: string;
  year: number;
  month: number;
  total_hours: number;
  shift_count: number;
}

interface AgentSection {
  title: string;
  agentId: string;
  totalHours: number;
  data: { siteId: string; siteName: string; hours: number; shiftCount: number }[];
}

async function fetchHoursSummary(year: number, month: number): Promise<HoursSummaryRow[]> {
  const { data, error } = await supabase.rpc('dirigeant_hours_summary', {
    p_year: year,
    p_month: month,
    p_site_id: null,
    p_agent_id: null,
  });
  if (error || !data) return [];
  return data as HoursSummaryRow[];
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export default function StatsOverviewScreen() {
  const now = React.useState(() => new Date())[0];
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const summaryQuery = useQuery({
    queryKey: ['dirigeantHoursSummary', year, month],
    queryFn: () => fetchHoursSummary(year, month),
  });

  const sections = useMemo<AgentSection[]>(() => {
    const rows = summaryQuery.data ?? [];
    const byAgent = new Map<string, AgentSection>();
    for (const row of rows) {
      const existing = byAgent.get(row.agent_id);
      const siteEntry = {
        siteId: row.site_id,
        siteName: row.site_name,
        hours: row.total_hours,
        shiftCount: row.shift_count,
      };
      if (existing) {
        existing.totalHours += row.total_hours;
        existing.data.push(siteEntry);
      } else {
        byAgent.set(row.agent_id, {
          title: row.agent_name,
          agentId: row.agent_id,
          totalHours: row.total_hours,
          data: [siteEntry],
        });
      }
    }
    return Array.from(byAgent.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [summaryQuery.data]);

  if (summaryQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <SectionList
      style={styles.screen}
      sections={sections}
      keyExtractor={(item) => item.siteId}
      onRefresh={() => summaryQuery.refetch()}
      refreshing={summaryQuery.isRefetching}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.monthLabelRow}>
          <Feather name="bar-chart-2" size={15} color={colors.textPrimary} />
          <Text style={styles.monthLabel}>Heures cumulées — {monthLabel}</Text>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderIcon}>
            <Feather name="user" size={14} color={colors.primary} />
          </View>
          <Text style={styles.agentName}>{section.title}</Text>
          <Text style={styles.agentTotal}>{formatHours(section.totalHours)}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={styles.siteRow}>
          <Feather name="map-pin" size={13} color={colors.textSecondary} />
          <Text style={styles.siteName}>{item.siteName}</Text>
          <Text style={styles.siteHours}>
            {formatHours(item.hours)} · {item.shiftCount} service(s)
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Feather name="bar-chart-2" size={22} color={colors.textMuted} />
          <Text style={styles.empty}>Aucune heure enregistrée ce mois-ci.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  list: { padding: spacing.lg },
  monthLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  monthLabel: { fontSize: 14, color: colors.textSecondary, textTransform: 'capitalize' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    ...cardShadow,
  },
  sectionHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  agentTotal: { fontSize: 15, fontWeight: '700', color: colors.primary },
  siteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  siteName: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  siteHours: { fontSize: 13, color: colors.textSecondary },
  empty: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  emptyBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
});
