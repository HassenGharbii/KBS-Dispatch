import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MissionsStackParamList } from '../../../navigation/DirigeantStack';
import { listAgents, reassignMission } from '../../../lib/missionsApi';
import { AgentPickerWithBroadcast } from '../../../components/AgentPickerWithBroadcast';
import { colors, spacing, radius, typography, cardShadow } from '../../../theme';

type Props = NativeStackScreenProps<MissionsStackParamList, 'MissionReassign'>;

export default function MissionReassignScreen({ route, navigation }: Props) {
  const { missionId } = route.params;
  const agentsQuery = useQuery({ queryKey: ['agents'], queryFn: listAgents });

  const [agentId, setAgentId] = useState<string | null>(null);
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit = Boolean(isBroadcast || agentId);

  async function handleReassign() {
    if (!isBroadcast && !agentId) return;
    setSaving(true);
    try {
      const { error } = await reassignMission(missionId, {
        agentId: isBroadcast ? null : agentId,
        isBroadcast,
      });
      if (error) {
        Alert.alert('Erreur', error);
        return;
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.labelRow}>
        <Feather name="users" size={14} color={colors.textSecondary} />
        <Text style={styles.label}>Nouvel agent</Text>
      </View>
      <AgentPickerWithBroadcast
        agents={agentsQuery.data ?? []}
        loading={agentsQuery.isLoading}
        agentId={agentId}
        onAgentIdChange={setAgentId}
        isBroadcast={isBroadcast}
        onIsBroadcastChange={setIsBroadcast}
      />

      <Pressable style={styles.button} onPress={handleReassign} disabled={!canSubmit || saving}>
        {saving ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <>
            <Feather name="repeat" size={17} color={colors.textOnPrimary} />
            <Text style={styles.buttonText}>Réaffecter</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg, marginBottom: spacing.sm },
  label: { ...typography.label, color: colors.textSecondary },
  button: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    ...cardShadow,
  },
  buttonText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
});
