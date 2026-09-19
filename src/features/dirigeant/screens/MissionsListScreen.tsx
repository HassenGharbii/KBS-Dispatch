import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import type { MissionsStackParamList } from '../../../navigation/DirigeantStack';
import { supabase } from '../../../lib/supabase';
import { listAllMissions, type MissionWithNames } from '../../../lib/missionsApi';
import { listSwapRequestsForOrg } from '../../../lib/swapApi';
import type { MissionStatus } from '../../../types/domain';
import { colors, spacing, radius, typography, cardShadow } from '../../../theme';

type Props = NativeStackScreenProps<MissionsStackParamList, 'MissionsList'>;

const STATUS_LABELS: Record<MissionStatus, string> = {
  proposed: 'Proposée',
  accepted: 'Acceptée',
  refused: 'Refusée',
  cancelled: 'Annulée',
  en_route: 'En route',
  in_progress: 'En cours',
  completed: 'Terminée',
};

// Matches the STATUS_PILL_STYLES convention already used on the agent app's
// MissionsScreen and the web console -- same statuses, same hues, across
// all three surfaces.
const STATUS_PILL_STYLES: Record<MissionStatus, { bg: string; fg: string }> = {
  proposed: { bg: '#fef3c7', fg: '#b45309' },
  accepted: { bg: colors.primaryLight, fg: colors.primary },
  refused: { bg: colors.dangerLight, fg: colors.danger },
  cancelled: { bg: '#f1f5f9', fg: colors.textMuted },
  en_route: { bg: colors.purpleLight, fg: colors.purple },
  in_progress: { bg: colors.successLight, fg: colors.success },
  completed: { bg: '#f1f5f9', fg: colors.textSecondary },
};

function StatusPill({ status }: { status: MissionStatus }) {
  const style = STATUS_PILL_STYLES[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: style.bg }]}>
      <Text style={[styles.statusPillText, { color: style.fg }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const LATE_THRESHOLD_MIN = 5;

function DelayBadge({ scheduledStart, actualStartAt }: { scheduledStart: string; actualStartAt: string }) {
  const delayMin = Math.round(
    (new Date(actualStartAt).getTime() - new Date(scheduledStart).getTime()) / 60_000
  );
  const isLate = delayMin > LATE_THRESHOLD_MIN;
  return (
    <View style={styles.delayRow}>
      <Feather name={isLate ? 'alert-triangle' : 'check-circle'} size={12} color={isLate ? colors.danger : colors.success} />
      <Text style={[styles.delay, { color: isLate ? colors.danger : colors.success }]}>
        Prise de service {formatDateTime(actualStartAt)}
        {isLate ? ` · en retard de ${delayMin} min` : " · à l'heure"}
      </Text>
    </View>
  );
}

const REASSIGNABLE: MissionStatus[] = ['cancelled', 'refused'];

function MissionRow({ mission, onReassign }: { mission: MissionWithNames; onReassign: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.siteRow}>
          <Feather name="map-pin" size={14} color={colors.textSecondary} />
          <Text style={styles.siteName}>{mission.siteName}</Text>
        </View>
        <StatusPill status={mission.status} />
      </View>
      <Text style={styles.meta}>
        {mission.agentName} · {formatDateTime(mission.scheduledStart)}
      </Text>
      {mission.instructions ? <Text style={styles.instructions}>{mission.instructions}</Text> : null}
      {mission.actualStartAt ? (
        <DelayBadge scheduledStart={mission.scheduledStart} actualStartAt={mission.actualStartAt} />
      ) : null}
      {REASSIGNABLE.includes(mission.status) && (
        <Pressable style={styles.reassignButton} onPress={onReassign}>
          <Feather name="repeat" size={13} color={colors.primary} />
          <Text style={styles.reassignButtonText}>Réaffecter</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function MissionsListScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const missionsQuery = useQuery({ queryKey: ['missions', 'all'], queryFn: listAllMissions });
  const swapQuery = useQuery({ queryKey: ['swapRequests', 'org'], queryFn: listSwapRequestsForOrg });
  const [swapExpanded, setSwapExpanded] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('missions-dirigeant')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['missions', 'all'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel('swap-requests-dirigeant')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_swap_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['swapRequests', 'org'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const openSwapRequests = (swapQuery.data ?? []).filter((r) => r.status === 'requested');

  return (
    <View style={styles.container}>
      <Pressable style={styles.createButton} onPress={() => navigation.navigate('MissionCreate')}>
        <Feather name="plus" size={17} color={colors.textOnPrimary} />
        <Text style={styles.createButtonText}>Nouvelle mission</Text>
      </Pressable>

      {openSwapRequests.length > 0 && (
        <View style={styles.swapSection}>
          <Pressable style={styles.swapHeader} onPress={() => setSwapExpanded((v) => !v)}>
            <Feather name="repeat" size={14} color={colors.purple} />
            <Text style={styles.swapHeaderText}>Échanges en cours ({openSwapRequests.length})</Text>
            <Feather name={swapExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.purple} />
          </Pressable>
          {swapExpanded &&
            openSwapRequests.map((r) => (
              <View key={r.id} style={styles.swapRow}>
                <Text style={styles.swapRowText}>
                  {r.fromAgentName} → {r.toAgentName} · {r.siteName}
                </Text>
              </View>
            ))}
        </View>
      )}

      {missionsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={missionsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MissionRow
              mission={item}
              onReassign={() => navigation.navigate('MissionReassign', { missionId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="clipboard" size={22} color={colors.textMuted} />
              <Text style={styles.empty}>Aucune mission créée.</Text>
            </View>
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  createButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.lg,
    marginBottom: 0,
    ...cardShadow,
  },
  createButtonText: { color: colors.textOnPrimary, fontSize: 15, fontWeight: '600' },
  swapSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.purpleLight,
    overflow: 'hidden',
  },
  swapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  swapHeaderText: { color: colors.purple, fontWeight: '700', fontSize: 13, flex: 1 },
  swapRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,58,237,0.15)',
  },
  swapRowText: { fontSize: 13, color: colors.purple },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  siteName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  statusPill: { borderRadius: radius.full, paddingVertical: 3, paddingHorizontal: spacing.sm },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
  instructions: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs, fontStyle: 'italic' },
  delayRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  delay: { fontSize: 12, fontWeight: '600' },
  reassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  reassignButtonText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  empty: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  emptyBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
});
