import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { MonthlyStats } from '../db/repositories/shiftsRepo';
import { colors, spacing, radius, typography, cardShadow } from '../theme';

interface Props {
  stats: MonthlyStats;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function Metric({ icon, value, label }: { icon: keyof typeof Feather.glyphMap; value: string | number; label: string }) {
  return (
    <View style={styles.metric}>
      <Feather name={icon} size={15} color={colors.primary} style={styles.metricIcon} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function AgentMonthlyStatsCard({ stats }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Feather name="bar-chart-2" size={15} color={colors.textPrimary} />
        <Text style={styles.title}>Ce mois-ci</Text>
      </View>
      <View style={styles.row}>
        <Metric icon="clock" value={formatHours(stats.totalHours)} label="Heures" />
        <Metric icon="calendar" value={stats.daysWorked} label="Jours" />
        <Metric icon="map-pin" value={stats.distinctSiteCount} label="Sites" />
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...cardShadow,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  title: { ...typography.label, color: colors.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center', flex: 1 },
  metricIcon: { marginBottom: spacing.xs },
  metricValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  metricLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  siteList: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.xs },
  siteRow: { flexDirection: 'row', justifyContent: 'space-between' },
  siteName: { fontSize: 13, color: colors.textSecondary },
  siteHours: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
});
