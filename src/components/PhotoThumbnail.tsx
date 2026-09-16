import React from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';

interface Props {
  uri: string;
  onPress?: () => void;
  size?: number;
}

export function PhotoThumbnail({ uri, onPress, size = 72 }: Props) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Image source={{ uri }} style={[styles.image, { width: size, height: size }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: 8, backgroundColor: '#e5e7eb' },
});
