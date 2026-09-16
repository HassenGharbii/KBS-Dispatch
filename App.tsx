import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { runMigrations } from './src/db/migrationRunner';
import { startSyncTriggers } from './src/sync/triggers';
import { recoverInterruptedSync } from './src/sync/syncEngine';
import { useConnectivityStore } from './src/store/useConnectivityStore';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const initConnectivity = useConnectivityStore((s) => s.init);

  useEffect(() => {
    initConnectivity();
    runMigrations()
      .then(() => recoverInterruptedSync())
      .then(() => {
        startSyncTriggers();
        setDbReady(true);
      })
      .catch((err) => {
        console.error('Failed to run local DB migrations', err);
      });
  }, [initConnectivity]);

  if (!dbReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
