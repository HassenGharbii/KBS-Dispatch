import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HistoryStackParamList } from '../../../navigation/AgentStack';
import { useAuthStore } from '../../../store/useAuthStore';
import { geocodeAddress } from '../../../lib/routing';
import { colors, spacing, radius, cardShadow } from '../../../theme';

type Props = NativeStackScreenProps<HistoryStackParamList, 'HomeAddress'>;

export default function HomeAddressScreen({ navigation }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const updateHomeAddress = useAuthStore((s) => s.updateHomeAddress);
  const [address, setAddress] = useState(profile?.homeAddress ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!address.trim()) return;
    setSaving(true);
    try {
      const coords = await geocodeAddress(address.trim());
      if (!coords) {
        Alert.alert(
          'Adresse introuvable',
          "Impossible de localiser cette adresse. Vérifiez l'orthographe ou précisez la ville."
        );
        return;
      }
      const { error } = await updateHomeAddress(address.trim(), coords.lat, coords.lng);
      if (error) {
        Alert.alert('Erreur', error);
        return;
      }
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Erreur', `Impossible d'enregistrer l'adresse.\n${message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Feather name="home" size={20} color={colors.primary} />
        </View>
        <Text style={styles.label}>Adresse de domicile</Text>
        <Text style={styles.hint}>Utilisée pour calculer l'heure de départ avant vos missions.</Text>
        <View style={styles.inputWrapper}>
          <Feather name="map-pin" size={16} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="12 rue Exemple, 69000 Lyon"
            placeholderTextColor={colors.textMuted}
            value={address}
            onChangeText={setAddress}
            autoFocus
          />
        </View>
        <Pressable style={styles.button} onPress={handleSave} disabled={saving || !address.trim()}>
          {saving ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <>
              <Feather name="save" size={16} color={colors.textOnPrimary} />
              <Text style={styles.buttonText}>Enregistrer</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...cardShadow,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  hint: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: 13, fontSize: 16, color: colors.textPrimary },
  button: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  buttonText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
});
