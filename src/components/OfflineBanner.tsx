import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useConnectivityStore } from '../store/useConnectivityStore';
import { colors, spacing } from '../theme';

export function OfflineBanner() {
  const isConnected = useConnectivityStore((s) => s.isConnected);
  if (isConnected) return null;
  return (
    <View style={styles.container}>
      <Feather name="wifi-off" size={14} color={colors.textOnPrimary} />
      <Text style={styles.text}>Hors ligne — les données sont enregistrées localement</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  text: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '600' },
});
