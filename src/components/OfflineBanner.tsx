import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useConnectivityStore } from '../store/useConnectivityStore';

export function OfflineBanner() {
  const isConnected = useConnectivityStore((s) => s.isConnected);
  if (isConnected) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hors ligne — les données sont enregistrées localement</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#374151', paddingVertical: 6, alignItems: 'center' },
  text: { color: '#fff', fontSize: 12 },
});
