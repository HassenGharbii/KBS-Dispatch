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
  Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  createUnavailability,
  listMyUnavailability,
  deleteUnavailability,
} from '../../../lib/unavailabilityApi';
import { colors, spacing, radius, typography, cardShadow } from '../../../theme';

// Day-level granularity (start of day -> end of day) is enough for this --
// purely informational for the dirigeant when planning, no automatic effect
// on missions, so a precise time-of-day range isn't worth the extra
// sequential date+time pickers MissionCreateScreen needs for a real
// scheduled_start.
function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UnavailabilityScreen() {
  const profile = useAuthStore((s) => s.profile);
  const agentId = profile?.id ?? '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unavailability', agentId],
    queryFn: () => listMyUnavailability(agentId),
    enabled: Boolean(agentId),
  });

  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const [endDate, setEndDate] = useState(() => endOfDay(new Date()));
  const [reason, setReason] = useState('');
  const [pickerField, setPickerField] = useState<'start' | 'end' | null>(null);
  const [saving, setSaving] = useState(false);

  function handlePickerChange(event: { type: string }, selected?: Date) {
    setPickerField(null);
    if (event.type !== 'set' || !selected) return;
    if (pickerField === 'start') setStartDate(startOfDay(selected));
    else if (pickerField === 'end') setEndDate(endOfDay(selected));
  }

  async function handleCreate() {
    if (!agentId || endDate < startDate) {
      Alert.alert('Erreur', 'La date de fin doit être après la date de début.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await createUnavailability(
        agentId,
        startDate.toISOString(),
        endDate.toISOString(),
        reason.trim() || null
      );
      if (error) {
        Alert.alert('Erreur', error);
        return;
      }
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['unavailability', agentId] });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const { error } = await deleteUnavailability(id);
    if (error) {
      Alert.alert('Erreur', error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['unavailability', agentId] });
  }

  const upcoming = (query.data ?? []).filter((u) => new Date(u.endAt).getTime() >= Date.now());

  return (
    <FlatList
      style={styles.screen}
      data={upcoming}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.rowIconCircle}>
            <Feather name="calendar" size={15} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowDates}>
              {formatDate(item.startAt)} → {formatDate(item.endAt)}
            </Text>
            {item.reason ? <Text style={styles.rowReason}>{item.reason}</Text> : null}
          </View>
          <Pressable style={styles.deleteRow} onPress={() => handleDelete(item.id)}>
            <Feather name="trash-2" size={14} color={colors.danger} />
            <Text style={styles.deleteText}>Supprimer</Text>
          </Pressable>
        </View>
      )}
      ListHeaderComponent={
        <View style={styles.form}>
          <View style={styles.card}>
            <Text style={styles.title}>Se déclarer indisponible</Text>
            <Text style={styles.hint}>
              Purement informatif pour le dirigeant lors de la planification -- n&apos;annule aucune
              mission déjà prévue.
            </Text>

            <Text style={styles.label}>Du</Text>
            <Pressable style={styles.dateButton} onPress={() => setPickerField('start')}>
              <Feather name="calendar" size={15} color={colors.textSecondary} />
              <Text style={styles.dateButtonText}>{formatDate(startDate.toISOString())}</Text>
            </Pressable>

            <Text style={styles.label}>Au</Text>
            <Pressable style={styles.dateButton} onPress={() => setPickerField('end')}>
              <Feather name="calendar" size={15} color={colors.textSecondary} />
              <Text style={styles.dateButtonText}>{formatDate(endDate.toISOString())}</Text>
            </Pressable>

            {pickerField && (
              <DateTimePicker
                value={pickerField === 'start' ? startDate : endDate}
                mode="date"
                display="default"
                onChange={handlePickerChange}
              />
            )}
            {Platform.OS === 'ios' && pickerField && (
              <Pressable style={styles.doneButton} onPress={() => setPickerField(null)}>
                <Text style={styles.doneButtonText}>OK</Text>
              </Pressable>
            )}

            <Text style={styles.label}>Motif (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Congés, rendez-vous…"
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={setReason}
            />

            <Pressable style={styles.button} onPress={handleCreate} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <>
                  <Feather name="plus" size={16} color={colors.textOnPrimary} />
                  <Text style={styles.buttonText}>Ajouter</Text>
                </>
              )}
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Mes indisponibilités à venir</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Feather name="calendar" size={24} color={colors.textMuted} />
          <Text style={styles.empty}>Aucune période déclarée.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  list: { padding: spacing.lg },
  form: { marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...cardShadow,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  hint: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dateButtonText: { fontSize: 15, color: colors.textPrimary },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  doneButtonText: { color: colors.textOnPrimary, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  button: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  buttonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16 },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm },
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
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDates: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  rowReason: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  empty: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  emptyBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
});
