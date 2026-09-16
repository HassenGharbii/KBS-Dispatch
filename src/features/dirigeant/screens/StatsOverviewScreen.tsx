import React, { useMemo } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.siteId}
      onRefresh={() => summaryQuery.refetch()}
      refreshing={summaryQuery.isRefetching}
      contentContainerStyle={styles.list}
      ListHeaderComponent={<Text style={styles.monthLabel}>Heures cumulées — {monthLabel}</Text>}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.agentName}>{section.title}</Text>
          <Text style={styles.agentTotal}>{formatHours(section.totalHours)}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={styles.siteRow}>
          <Text style={styles.siteName}>{item.siteName}</Text>
          <Text style={styles.siteHours}>
            {formatHours(item.hours)} · {item.shiftCount} service(s)
          </Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>Aucune heure enregistrée ce mois-ci.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  monthLabel: { fontSize: 14, color: '#6b7280', marginBottom: 12, textTransform: 'capitalize' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  agentName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  agentTotal: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  siteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  siteName: { fontSize: 14, color: '#374151' },
  siteHours: { fontSize: 13, color: '#6b7280' },
  empty: { color: '#6b7280', fontStyle: 'italic', marginTop: 24, textAlign: 'center' },
});
