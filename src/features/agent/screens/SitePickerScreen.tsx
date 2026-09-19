import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import type { ServiceStackParamList } from '../../../navigation/AgentStack';
import { useAuthStore } from '../../../store/useAuthStore';
import { listActiveSites } from '../../../db/repositories/sitesRepo';
import { startShift, backfillShiftStartLocation } from '../../../db/repositories/shiftsRepo';
import { beginLocationFix, withTimeout } from '../../../lib/location';
import { runSync, refreshPendingCount } from '../../../sync/syncEngine';
import { colors, spacing, radius, cardShadow } from '../../../theme';

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
      <View style={styles.searchWrapper}>
        <Feather name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          placeholder="Rechercher un site…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {sitesQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
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
              <View style={styles.rowIconCircle}>
                <Feather name="map-pin" size={16} color={colors.primary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.siteName}>{item.name}</Text>
                <Text style={styles.siteAddress}>{item.address}</Text>
              </View>
              {startingSiteId === item.id ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="map" size={24} color={colors.textMuted} />
              <Text style={styles.empty}>Aucun site trouvé.</Text>
            </View>
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: { marginRight: spacing.sm },
  search: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.textPrimary },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  siteName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  siteAddress: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  empty: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  emptyBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
});
