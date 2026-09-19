import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import type { ServiceStackParamList } from '../../../navigation/AgentStack';
import { CategoryGrid } from '../../../components/CategoryGrid';
import { ItemChecklist } from '../../../components/ItemChecklist';
import { PhotoCapturePanel, type CapturedPhoto } from '../../../components/PhotoCapturePanel';
import type { ReferenceCategory } from '../../../constants/referenceList';
import { useAuthStore } from '../../../store/useAuthStore';
import { createEvent } from '../../../db/repositories/eventsRepo';
import { createPhoto } from '../../../db/repositories/photosRepo';
import { beginLocationFix, withTimeout } from '../../../lib/location';
import { runSync, refreshPendingCount } from '../../../sync/syncEngine';
import { colors, spacing, radius, typography, cardShadow } from '../../../theme';

type Props = NativeStackScreenProps<ServiceStackParamList, 'EventEntry'>;

export default function EventEntryScreen({ route, navigation }: Props) {
  const { shiftId } = route.params;
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<ReferenceCategory | null>(null);
  const [itemCodes, setItemCodes] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [photoCapturing, setPhotoCapturing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Kicked off as soon as the screen opens so it's very likely already
  // resolved by the time the agent hits "Enregistrer" a few seconds later —
  // event save must stay fast (<10s NFR), so we never block on this.
  const locationFixRef = useRef(beginLocationFix());

  const canSave = useMemo(() => Boolean(category) && itemCodes.length > 0, [category, itemCodes]);

  function toggleItem(itemCode: string) {
    setItemCodes((prev) =>
      prev.includes(itemCode) ? prev.filter((c) => c !== itemCode) : [...prev, itemCode]
    );
  }

  async function handleSave() {
    if (!profile || !category) return;
    setSaving(true);

    try {
      const fix = await withTimeout(locationFixRef.current, 2000);

      const event = await createEvent({
        shiftId,
        agentId: profile.id,
        categoryCode: category.code,
        itemCodes,
        comment: comment.trim() || null,
        lat: fix?.lat ?? null,
        lng: fix?.lng ?? null,
        accuracy: fix?.accuracy ?? null,
      });

      await Promise.all(
        photos.map((photo) =>
          createPhoto({
            eventId: event.id,
            agentId: profile.id,
            localUri: photo.uri,
            width: photo.width,
            height: photo.height,
            fileSizeBytes: null,
          })
        )
      );

      await refreshPendingCount();
      runSync();
      queryClient.invalidateQueries({ queryKey: ['events', shiftId] });
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Erreur', `Impossible d'enregistrer l'événement. Réessayez.\n${message}`);
    } finally {
      setSaving(false);
    }
  }

  if (!category) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Choisir une catégorie</Text>
        <CategoryGrid selectedCategoryCode={null} onSelect={setCategory} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Pressable
        style={styles.changeCategoryRow}
        onPress={() => {
          setCategory(null);
          setItemCodes([]);
        }}
      >
        <Feather name="chevron-left" size={16} color={colors.primary} />
        <Text style={styles.changeCategory}>Changer de catégorie</Text>
      </Pressable>
      <Text style={styles.sectionTitle}>{category.label}</Text>
      <View style={styles.card}>
        <ItemChecklist items={category.items} selectedItemCodes={itemCodes} onToggle={toggleItem} />
      </View>

      <Text style={styles.sectionTitle}>Commentaire (optionnel)</Text>
      <TextInput
        style={styles.commentInput}
        multiline
        placeholder="Précisions…"
        placeholderTextColor={colors.textMuted}
        value={comment}
        onChangeText={setComment}
      />

      <Text style={styles.sectionTitle}>Photos</Text>
      <PhotoCapturePanel photos={photos} onChange={setPhotos} onCapturingChange={setPhotoCapturing} />

      <Pressable
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave || saving || photoCapturing}
      >
        {saving ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <>
            <Feather name="save" size={17} color={colors.textOnPrimary} />
            <Text style={styles.saveButtonText}>
              {photoCapturing ? 'Traitement de la photo…' : 'Enregistrer'}
            </Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginTop: spacing.sm },
  changeCategoryRow: { flexDirection: 'row', alignItems: 'center' },
  changeCategory: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...cardShadow,
  },
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
  saveButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...cardShadow,
  },
  saveButtonDisabled: { backgroundColor: colors.textMuted },
  saveButtonText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
});
