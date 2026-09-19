import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSyncStatusStore } from '../store/useSyncStatusStore';
import { runSync } from '../sync/syncEngine';
import { colors, spacing } from '../theme';

export function SyncStatusBadge() {
  const pendingCount = useSyncStatusStore((s) => s.pendingCount);
  const isSyncing = useSyncStatusStore((s) => s.isSyncing);
  const lastSyncError = useSyncStatusStore((s) => s.lastSyncError);

  if (pendingCount === 0 && !isSyncing && !lastSyncError) return null;

  return (
    <Pressable style={styles.container} onPress={() => runSync()} disabled={isSyncing}>
      {isSyncing ? (
        <ActivityIndicator size="small" color={colors.warning} />
      ) : (
        <>
          <Feather
            name={lastSyncError ? 'alert-triangle' : 'refresh-cw'}
            size={13}
            color={colors.warning}
          />
          <Text style={styles.text}>
            {lastSyncError
              ? 'Erreur de synchro — appuyer pour réessayer'
              : `${pendingCount} élément(s) en attente de synchro`}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: { fontSize: 13, color: colors.warning, fontWeight: '600' },
});
