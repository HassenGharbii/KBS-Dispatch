import React from 'react';
import { Modal, Image, Pressable, Text, StyleSheet } from 'react-native';

interface Props {
  uri: string | null;
  onClose: () => void;
}

export function PhotoFullScreenViewer({ uri, onClose }: Props) {
  return (
    <Modal visible={uri !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {uri && <Image source={{ uri }} style={styles.image} resizeMode="contain" />}
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Fermer</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '80%' },
  closeButton: { position: 'absolute', top: 48, right: 24, padding: 12 },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
