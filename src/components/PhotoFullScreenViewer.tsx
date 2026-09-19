import React from 'react';
import { Modal, Image, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
          <Feather name="x" size={22} color="#fff" />
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
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 24,
    padding: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
