import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
        <ActivityIndicator />
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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Catégorie</Text>
        <CategoryGrid selectedCategoryCode={editCategory?.code ?? null} onSelect={setEditCategory} />
        {editCategory && (
          <>
            <Text style={styles.sectionTitle}>{editCategory.label}</Text>
            <ItemChecklist
              items={editCategory.items}
              selectedItemCodes={editItemCodes}
              onToggle={toggleEditItem}
            />
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
            <Text style={styles.secondaryButtonText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={handleSaveEdit}
            disabled={saving || editItemCodes.length === 0}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Enregistrer</Text>}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const itemLabels = event.itemCodes
    .map((code) => category?.items.find((i) => i.code === code)?.label ?? code)
    .join(', ');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.time}>{formatDateTime(event.occurredAt)}</Text>
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

      <Text style={styles.syncStatus}>
        {event.syncStatus === 'synced' ? 'Synchronisé' : 'En attente de synchronisation'}
      </Text>

      {editable && (
        <View style={styles.row}>
          <Pressable style={styles.secondaryButton} onPress={startEditing}>
            <Text style={styles.secondaryButtonText}>Modifier</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Supprimer</Text>
          </Pressable>
        </View>
      )}

      <PhotoFullScreenViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: 13, color: '#6b7280' },
  category: { fontSize: 18, fontWeight: '700', color: '#111827' },
  items: { fontSize: 15, color: '#374151' },
  comment: { fontSize: 14, color: '#4b5563', fontStyle: 'italic' },
  photoRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  syncStatus: { fontSize: 12, color: '#6b7280', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  commentInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#1d4ed8', fontWeight: '700' },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#dc2626', fontWeight: '700' },
});
