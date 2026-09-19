import React, { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
// The newer context-based API (useImageManipulator) is a React hook meant for
// interactive editing UI tied to component render; it can't be called from
// inside an async event handler for a one-shot capture-then-compress like
// this. manipulateAsync is deprecated but remains the correct fit here.
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, spacing, radius } from '../theme';

export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
}

interface Props {
  photos: CapturedPhoto[];
  onChange: (photos: CapturedPhoto[]) => void;
  maxPhotos?: number;
  // Lets the parent screen block "Enregistrer" while a capture is still
  // resizing/compressing -- without this, saving mid-capture silently drops
  // the photo (it never makes it into `photos` state in time).
  onCapturingChange?: (capturing: boolean) => void;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.65;

export function PhotoCapturePanel({ photos, onChange, maxPhotos = 4, onCapturingChange }: Props) {
  const [capturing, setCapturing] = useState(false);

  async function handleCapture() {
    if (photos.length >= maxPhotos || capturing) return;

    setCapturing(true);
    onCapturingChange?.(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Autorisation requise',
          "L'accès à l'appareil photo est nécessaire pour ajouter une photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ quality: 1, exif: false });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: MAX_DIMENSION } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: JPEG_QUALITY }
      );

      onChange([
        ...photos,
        { uri: manipulated.uri, width: manipulated.width, height: manipulated.height },
      ]);
    } finally {
      setCapturing(false);
      onCapturingChange?.(false);
    }
  }

  function handleRemove(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {photos.map((photo, index) => (
          <View key={photo.uri} style={styles.thumbWrapper}>
            <Image source={{ uri: photo.uri }} style={styles.thumb} />
            <Pressable style={styles.removeButton} onPress={() => handleRemove(index)}>
              <Feather name="x" size={13} color={colors.textOnPrimary} />
            </Pressable>
          </View>
        ))}
        {photos.length < maxPhotos && (
          <Pressable style={styles.addButton} onPress={handleCapture} disabled={capturing}>
            {capturing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Feather name="camera" size={20} color={colors.primary} />
                <Text style={styles.addButtonText}>Photo</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
      <Text style={styles.hint}>
        {capturing ? 'Traitement de la photo…' : `${photos.length} / ${maxPhotos} photos`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrapper: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: radius.sm },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.danger,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addButtonText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.textSecondary },
});
