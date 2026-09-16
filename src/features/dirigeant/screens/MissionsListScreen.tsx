import React, { useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MissionsStackParamList } from '../../../navigation/DirigeantStack';
import { supabase } from '../../../lib/supabase';
import { listAllMissions, type MissionWithNames } from '../../../lib/missionsApi';
import type { MissionStatus } from '../../../types/domain';

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

const STATUS_COLORS: Record<MissionStatus, string> = {
  proposed: '#b45309',
  accepted: '#1d4ed8',
  refused: '#dc2626',
  cancelled: '#6b7280',
  en_route: '#7c3aed',
  in_progress: '#059669',
  completed: '#111827',
};

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
    <Text style={[styles.delay, { color: isLate ? '#dc2626' : '#059669' }]}>
      Prise de service {formatDateTime(actualStartAt)}
      {isLate ? ` · en retard de ${delayMin} min` : ' · à l\'heure'}
    </Text>
  );
}

function MissionRow({ mission }: { mission: MissionWithNames }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.siteName}>{mission.siteName}</Text>
        <Text style={[styles.status, { color: STATUS_COLORS[mission.status] }]}>
          {STATUS_LABELS[mission.status]}
        </Text>
      </View>
      <Text style={styles.meta}>
        {mission.agentName} · {formatDateTime(mission.scheduledStart)}
      </Text>
      {mission.instructions ? <Text style={styles.instructions}>{mission.instructions}</Text> : null}
      {mission.actualStartAt ? (
        <DelayBadge scheduledStart={mission.scheduledStart} actualStartAt={mission.actualStartAt} />
      ) : null}
    </View>
  );
}

export default function MissionsListScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const missionsQuery = useQuery({ queryKey: ['missions', 'all'], queryFn: listAllMissions });

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

  return (
    <View style={styles.container}>
      <Pressable style={styles.createButton} onPress={() => navigation.navigate('MissionCreate')}>
        <Text style={styles.createButtonText}>+ Nouvelle mission</Text>
      </Pressable>
      {missionsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={missionsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MissionRow mission={item} />}
          ListEmptyComponent={<Text style={styles.empty}>Aucune mission créée.</Text>}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  createButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    margin: 16,
    marginBottom: 0,
  },
  createButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  siteName: { fontSize: 16, fontWeight: '600' },
  status: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  instructions: { fontSize: 13, color: '#374151', marginTop: 4, fontStyle: 'italic' },
  delay: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  empty: { color: '#6b7280', fontStyle: 'italic', marginTop: 24, textAlign: 'center' },
});
