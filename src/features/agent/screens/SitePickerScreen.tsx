import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ServiceStackParamList } from '../../../navigation/AgentStack';
import { useAuthStore } from '../../../store/useAuthStore';
import { listActiveSites } from '../../../db/repositories/sitesRepo';
import { startShift, backfillShiftStartLocation } from '../../../db/repositories/shiftsRepo';
import { beginLocationFix, withTimeout } from '../../../lib/location';
import { runSync, refreshPendingCount } from '../../../sync/syncEngine';

type Props = NativeStackScreenProps<ServiceStackParamList, 'SitePicker'>;

export default function SitePickerScreen({ navigation }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [startingSiteId, setStartingSiteId] = useState<string | null>(null);

  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: listActiveSites });
  const sites = (sitesQuery.data ?? []).filter(
    (site) =>
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.address.toLowerCase().includes(search.toLowerCase())
  );

  async function handlePick(siteId: string) {
    if (!profile) return;
    setStartingSiteId(siteId);

    try {
      const fixPromise = beginLocationFix();
      const fix = await withTimeout(fixPromise, 8000);

      const shift = await startShift({
        agentId: profile.id,
        siteId,
        startLat: fix?.lat ?? null,
        startLng: fix?.lng ?? null,
        startAccuracy: fix?.accuracy ?? null,
      });

      if (!fix) {
        fixPromise.then((lateFix) => {
          if (lateFix) backfillShiftStartLocation(shift.id, lateFix.lat, lateFix.lng, lateFix.accuracy);
        });
      }

      await refreshPendingCount();
      runSync();
      queryClient.invalidateQueries({ queryKey: ['openShift', profile.id] });
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Erreur', `Impossible de prendre le service. Réessayez.\n${message}`);
    } finally {
      setStartingSiteId(null);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Rechercher un site…"
        value={search}
        onChangeText={setSearch}
      />
      {sitesQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={sites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => handlePick(item.id)}
              disabled={startingSiteId !== null}
            >
              <Text style={styles.siteName}>{item.name}</Text>
              <Text style={styles.siteAddress}>{item.address}</Text>
              {startingSiteId === item.id && <ActivityIndicator style={{ marginTop: 8 }} />}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Aucun site trouvé.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  search: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  siteName: { fontSize: 16, fontWeight: '600' },
  siteAddress: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  empty: { color: '#6b7280', fontStyle: 'italic', marginTop: 24, textAlign: 'center' },
});
