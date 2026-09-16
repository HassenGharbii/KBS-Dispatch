import React, { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
// The newer context-based API (useImageManipulator) is a React hook meant for
// interactive editing UI tied to component render; it can't be called from
// inside an async event handler for a one-shot capture-then-compress like
// this. manipulateAsync is deprecated but remains the correct fit here.
import * as ImageManipulator from 'expo-image-manipulator';

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
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </View>
        ))}
        {photos.length < maxPhotos && (
          <Pressable style={styles.addButton} onPress={handleCapture} disabled={capturing}>
            {capturing ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={styles.addButtonText}>+ Photo</Text>
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
  container: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrapper: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#dc2626',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 14, lineHeight: 16 },
  addButton: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: 12, color: '#374151', textAlign: 'center' },
  hint: { fontSize: 12, color: '#6b7280' },
});
