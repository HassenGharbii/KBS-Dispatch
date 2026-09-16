import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MonthlyStats } from '../db/repositories/shiftsRepo';

interface Props {
  stats: MonthlyStats;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export function AgentMonthlyStatsCard({ stats }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Ce mois-ci</Text>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{formatHours(stats.totalHours)}</Text>
          <Text style={styles.metricLabel}>Heures</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{stats.daysWorked}</Text>
          <Text style={styles.metricLabel}>Jours</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{stats.distinctSiteCount}</Text>
          <Text style={styles.metricLabel}>Sites</Text>
        </View>
      </View>
      {stats.bySite.length > 0 && (
        <View style={styles.siteList}>
          {stats.bySite.map((site) => (
            <View key={site.siteId} style={styles.siteRow}>
              <Text style={styles.siteName}>{site.siteName}</Text>
              <Text style={styles.siteHours}>{formatHours(site.hours)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 12, color: '#111827' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center', flex: 1 },
  metricValue: { fontSize: 20, fontWeight: '700', color: '#1d4ed8' },
  metricLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  siteList: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10, gap: 6 },
  siteRow: { flexDirection: 'row', justifyContent: 'space-between' },
  siteName: { fontSize: 13, color: '#374151' },
  siteHours: { fontSize: 13, color: '#374151', fontWeight: '600' },
});
