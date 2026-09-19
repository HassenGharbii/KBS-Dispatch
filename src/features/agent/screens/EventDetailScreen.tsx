import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import type { ServiceStackParamList } from '../../../navigation/AgentStack';
import { CategoryGrid } from '../../../components/CategoryGrid';
import { ItemChecklist } from '../../../components/ItemChecklist';
import { PhotoThumbnail } from '../../../components/PhotoThumbnail';
import { PhotoFullScreenViewer } from '../../../components/PhotoFullScreenViewer';
import { REFERENCE_LIST, type ReferenceCategory } from '../../../constants/referenceList';
import {
  getEventById,
  updateEventIfNotSynced,
  deleteEventIfNotSynced,
} from '../../../db/repositories/eventsRepo';
import { listPhotosForEvent } from '../../../db/repositories/photosRepo';
import { runSync, refreshPendingCount } from '../../../sync/syncEngine';
import { colors, spacing, radius, typography, cardShadow } from '../../../theme';

type Props = NativeStackScreenProps<ServiceStackParamList, 'EventDetail'>;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function EventDetailScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const queryClient = useQueryClient();

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => getEventById(eventId) });
  const photosQuery = useQuery({
    queryKey: ['eventPhotos', eventId],
    queryFn: () => listPhotosForEvent(eventId),
  });

  const [editing, setEditing] = useState(false);
  const [editCategory, setEditCategory] = useState<ReferenceCategory | null>(null);
  const [editItemCodes, setEditItemCodes] = useState<string[]>([]);
  const [editComment, setEditComment] = useState('');
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const event = eventQuery.data;
  if (!event) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const editable = event.syncStatus !== 'synced';
  const category = REFERENCE_LIST.find((c) => c.code === event.categoryCode);

  function startEditing() {
    setEditCategory(category ?? null);
    setEditItemCodes(event!.itemCodes);
    setEditComment(event!.comment ?? '');
    setEditing(true);
  }

  async function handleSaveEdit() {
    if (!editCategory) return;
    setSaving(true);
    try {
      const ok = await updateEventIfNotSynced(eventId, {
        categoryCode: editCategory.code,
        itemCodes: editItemCodes,
        comment: editComment.trim() || null,
      });
      if (!ok) {
        Alert.alert('Événement déjà synchronisé', "Cet événement ne peut plus être modifié.");
        setEditing(false);
        eventQuery.refetch();
        return;
      }
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', event!.shiftId] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Erreur', `Impossible d'enregistrer les modifications. Réessayez.\n${message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Supprimer cet événement ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            const ok = await deleteEventIfNotSynced(eventId);
            if (!ok) {
              Alert.alert('Événement déjà synchronisé', 'Cet événement ne peut plus être supprimé.');
              return;
            }
            queryClient.invalidateQueries({ queryKey: ['events', event!.shiftId] });
            navigation.goBack();
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            Alert.alert('Erreur', `Impossible de supprimer l'événement. Réessayez.\n${message}`);
          }
        },
      },
    ]);
  }

  function toggleEditItem(itemCode: string) {
    setEditItemCodes((prev) =>
      prev.includes(itemCode) ? prev.filter((c) => c !== itemCode) : [...prev, itemCode]
    );
  }

  if (editing) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Catégorie</Text>
        <CategoryGrid selectedCategoryCode={editCategory?.code ?? null} onSelect={setEditCategory} />
        {editCategory && (
          <>
            <Text style={styles.sectionTitle}>{editCategory.label}</Text>
            <View style={styles.card}>
              <ItemChecklist
                items={editCategory.items}
                selectedItemCodes={editItemCodes}
                onToggle={toggleEditItem}
              />
            </View>
          </>
        )}
        <Text style={styles.sectionTitle}>Commentaire</Text>
        <TextInput
          style={styles.commentInput}
          multiline
          value={editComment}
          onChangeText={setEditComment}
        />
        <View style={styles.row}>
          <Pressable style={styles.secondaryButton} onPress={() => setEditing(false)}>
            <Feather name="x" size={16} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={handleSaveEdit}
            disabled={saving || editItemCodes.length === 0}
          >
            {saving ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <>
                <Feather name="save" size={16} color={colors.textOnPrimary} />
                <Text style={styles.primaryButtonText}>Enregistrer</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const itemLabels = event.itemCodes
    .map((code) => category?.items.find((i) => i.code === code)?.label ?? code)
    .join(', ');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.timeRow}>
          <Feather name="clock" size={13} color={colors.textSecondary} />
          <Text style={styles.time}>{formatDateTime(event.occurredAt)}</Text>
        </View>
        <Text style={styles.category}>{category?.label ?? event.categoryCode}</Text>
        <Text style={styles.items}>{itemLabels}</Text>
        {event.comment ? <Text style={styles.comment}>{event.comment}</Text> : null}

        {(photosQuery.data ?? []).length > 0 && (
          <View style={styles.photoRow}>
            {(photosQuery.data ?? []).map((photo) =>
              photo.localUri ? (
                <PhotoThumbnail
                  key={photo.id}
                  uri={photo.localUri}
                  onPress={() => setViewerUri(photo.localUri)}
                />
              ) : null
            )}
          </View>
        )}

        <View style={styles.syncStatusRow}>
          <Feather
            name={event.syncStatus === 'synced' ? 'check-circle' : 'clock'}
            size={12}
            color={event.syncStatus === 'synced' ? colors.success : colors.warning}
          />
          <Text
            style={[
              styles.syncStatus,
              { color: event.syncStatus === 'synced' ? colors.success : colors.warning },
            ]}
          >
            {event.syncStatus === 'synced' ? 'Synchronisé' : 'En attente de synchronisation'}
          </Text>
        </View>
      </View>

      {editable && (
        <View style={styles.row}>
          <Pressable style={styles.secondaryButton} onPress={startEditing}>
            <Feather name="edit-2" size={15} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Modifier</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Feather name="trash-2" size={15} color={colors.danger} />
            <Text style={styles.deleteButtonText}>Supprimer</Text>
          </Pressable>
        </View>
      )}

      <PhotoFullScreenViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
    ...cardShadow,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  time: { fontSize: 13, color: colors.textSecondary },
  category: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  items: { fontSize: 15, color: colors.textSecondary },
  comment: { fontSize: 14, color: colors.textSecondary, fontStyle: 'italic' },
  photoRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  syncStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  syncStatus: { fontSize: 12, fontWeight: '600' },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginTop: spacing.sm },
  commentInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.textPrimary,
  },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: colors.textOnPrimary, fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '700' },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: { color: colors.danger, fontWeight: '700' },
});
