import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HistoryStackParamList } from '../../../navigation/AgentStack';
import { useAuthStore } from '../../../store/useAuthStore';
import { geocodeAddress } from '../../../lib/routing';

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
      <Text style={styles.label}>Adresse de domicile</Text>
      <Text style={styles.hint}>
        Utilisée pour calculer l'heure de départ avant vos missions.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="12 rue Exemple, 69000 Lyon"
        value={address}
        onChangeText={setAddress}
        autoFocus
      />
      <Pressable style={styles.button} onPress={handleSave} disabled={saving || !address.trim()}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enregistrer</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
