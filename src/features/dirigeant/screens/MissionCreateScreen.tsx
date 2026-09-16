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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MissionsStackParamList } from '../../../navigation/DirigeantStack';
import { useAuthStore } from '../../../store/useAuthStore';
import { listActiveSites } from '../../../db/repositories/sitesRepo';
import { listAgents, createMission } from '../../../lib/missionsApi';

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
  const [scheduledStart, setScheduledStart] = useState(defaultScheduledStart);
  // Android's native picker only supports a single mode per dialog, so
  // creating a mission walks date -> time as two separate dialogs; iOS's
  // picker supports a combined 'datetime' spinner in one step.
  const [pickerStep, setPickerStep] = useState<'date' | 'time' | null>(null);
  const pickerMode = Platform.OS === 'ios' ? 'datetime' : (pickerStep ?? 'date');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = Boolean(siteId && agentId && profile);

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
    if (!siteId || !agentId || !profile) return;
    setSaving(true);
    try {
      const { error } = await createMission({
        siteId,
        agentId,
        createdBy: profile.id,
        scheduledStart: scheduledStart.toISOString(),
        instructions: instructions.trim() || null,
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
      <Text style={styles.label}>Site</Text>
      {sitesQuery.isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={sitesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.optionRow, siteId === item.id && styles.optionRowSelected]}
              onPress={() => setSiteId(item.id)}
            >
              <Text style={styles.optionText}>{item.name}</Text>
              <Text style={styles.optionSubtext}>{item.address}</Text>
            </Pressable>
          )}
        />
      )}

      <Text style={styles.label}>Agent</Text>
      {agentsQuery.isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={agentsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.optionRow, agentId === item.id && styles.optionRowSelected]}
              onPress={() => setAgentId(item.id)}
            >
              <Text style={styles.optionText}>{item.fullName}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Aucun agent trouvé.</Text>}
        />
      )}

      <Text style={styles.label}>Date et heure de prise de service</Text>
      <Pressable style={styles.dateButton} onPress={() => setPickerStep('date')}>
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

      <Text style={styles.label}>Consignes particulières</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Consignes pour l'agent…"
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />

      <Pressable style={styles.button} onPress={handleCreate} disabled={!canSubmit || saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Créer la mission</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: { fontSize: 16 },
  doneButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  doneButtonText: { color: '#fff', fontWeight: '600' },
  optionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
  },
  optionRowSelected: { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  optionText: { fontSize: 15, fontWeight: '600' },
  optionSubtext: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empty: { color: '#6b7280', fontStyle: 'italic' },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
