import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MissionsStackParamList } from '../../../navigation/DirigeantStack';
import { useAuthStore } from '../../../store/useAuthStore';
import { listActiveSites } from '../../../db/repositories/sitesRepo';
import { listAgents, createMission } from '../../../lib/missionsApi';
import { AgentPickerWithBroadcast } from '../../../components/AgentPickerWithBroadcast';
import { colors, spacing, radius, typography, cardShadow } from '../../../theme';

type Props = NativeStackScreenProps<MissionsStackParamList, 'MissionCreate'>;

function defaultScheduledStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function formatScheduledStart(d: Date): string {
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MissionCreateScreen({ navigation }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: listActiveSites });
  const agentsQuery = useQuery({ queryKey: ['agents'], queryFn: listAgents });

  const [siteId, setSiteId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [scheduledStart, setScheduledStart] = useState(defaultScheduledStart);
  // Android's native picker only supports a single mode per dialog, so
  // creating a mission walks date -> time as two separate dialogs; iOS's
  // picker supports a combined 'datetime' spinner in one step.
  const [pickerStep, setPickerStep] = useState<'date' | 'time' | null>(null);
  const pickerMode = Platform.OS === 'ios' ? 'datetime' : (pickerStep ?? 'date');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = Boolean(siteId && profile && (isBroadcast || agentId));

  function handlePickerChange(event: { type: string }, selected?: Date) {
    // Android dismisses immediately after either a tap on a value or Cancel;
    // iOS keeps the spinner mounted until the user taps the "OK" button below.
    if (Platform.OS === 'android') setPickerStep(null);
    if (event.type !== 'set' || !selected) return;

    setScheduledStart((prev) => {
      const next = new Date(prev);
      if (pickerMode === 'datetime') {
        return selected;
      }
      if (pickerMode === 'date') {
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      } else {
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      }
      return next;
    });

    if (Platform.OS === 'android' && pickerStep === 'date') {
      setPickerStep('time');
    }
  }

  async function handleCreate() {
    if (!siteId || !profile || (!isBroadcast && !agentId)) return;
    setSaving(true);
    try {
      const { error } = await createMission({
        siteId,
        agentId: isBroadcast ? null : agentId,
        createdBy: profile.id,
        scheduledStart: scheduledStart.toISOString(),
        instructions: instructions.trim() || null,
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
        <Feather name="map-pin" size={14} color={colors.textSecondary} />
        <Text style={styles.label}>Site</Text>
      </View>
      {sitesQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={sitesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const selected = siteId === item.id;
            return (
              <Pressable
                style={[styles.optionRow, selected && styles.optionRowSelected]}
                onPress={() => setSiteId(item.id)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionText}>{item.name}</Text>
                  <Text style={styles.optionSubtext}>{item.address}</Text>
                </View>
                {selected && <Feather name="check-circle" size={17} color={colors.primary} />}
              </Pressable>
            );
          }}
        />
      )}

      <View style={styles.labelRow}>
        <Feather name="users" size={14} color={colors.textSecondary} />
        <Text style={styles.label}>Agent</Text>
      </View>
      <AgentPickerWithBroadcast
        agents={agentsQuery.data ?? []}
        loading={agentsQuery.isLoading}
        agentId={agentId}
        onAgentIdChange={setAgentId}
        isBroadcast={isBroadcast}
        onIsBroadcastChange={setIsBroadcast}
      />

      <View style={styles.labelRow}>
        <Feather name="clock" size={14} color={colors.textSecondary} />
        <Text style={styles.label}>Date et heure de prise de service</Text>
      </View>
      <Pressable style={styles.dateButton} onPress={() => setPickerStep('date')}>
        <Feather name="calendar" size={16} color={colors.textSecondary} />
        <Text style={styles.dateButtonText}>{formatScheduledStart(scheduledStart)}</Text>
      </Pressable>
      {pickerStep && (
        <DateTimePicker
          value={scheduledStart}
          mode={pickerMode}
          display="default"
          is24Hour
          onChange={handlePickerChange}
        />
      )}
      {Platform.OS === 'ios' && pickerStep && (
        <Pressable style={styles.doneButton} onPress={() => setPickerStep(null)}>
          <Text style={styles.doneButtonText}>OK</Text>
        </Pressable>
      )}

      <View style={styles.labelRow}>
        <Feather name="file-text" size={14} color={colors.textSecondary} />
        <Text style={styles.label}>Consignes particulières</Text>
      </View>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Consignes pour l'agent…"
        placeholderTextColor={colors.textMuted}
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />

      <Pressable style={styles.button} onPress={handleCreate} disabled={!canSubmit || saving}>
        {saving ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <>
            <Feather name="check" size={17} color={colors.textOnPrimary} />
            <Text style={styles.buttonText}>Créer la mission</Text>
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
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dateButtonText: { fontSize: 16, color: colors.textPrimary },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  doneButtonText: { color: colors.textOnPrimary, fontWeight: '600' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  optionRowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionContent: { flex: 1 },
  optionText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  optionSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  empty: { color: colors.textMuted, fontStyle: 'italic' },
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
