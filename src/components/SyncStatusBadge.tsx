import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSyncStatusStore } from '../store/useSyncStatusStore';
import { runSync } from '../sync/syncEngine';

export function SyncStatusBadge() {
  const pendingCount = useSyncStatusStore((s) => s.pendingCount);
  const isSyncing = useSyncStatusStore((s) => s.isSyncing);
  const lastSyncError = useSyncStatusStore((s) => s.lastSyncError);

  if (pendingCount === 0 && !isSyncing && !lastSyncError) return null;

  return (
    <Pressable style={styles.container} onPress={() => runSync()} disabled={isSyncing}>
      {isSyncing ? (
        <ActivityIndicator size="small" color="#92400e" />
      ) : (
        <Text style={styles.text}>
          {lastSyncError
            ? 'Erreur de synchro — appuyer pour réessayer'
            : `${pendingCount} élément(s) en attente de synchro`}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  text: { fontSize: 13, color: '#92400e' },
});
