import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '../../../store/useAuthStore';
import { ensureLocationPermission } from '../../../lib/location';

export default function ConsentScreen() {
  const recordGeolocConsent = useAuthStore((s) => s.recordGeolocConsent);
  const [submitting, setSubmitting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  async function handleAccept() {
    setSubmitting(true);
    try {
      const granted = await ensureLocationPermission();
      if (!granted) {
        setPermissionDenied(true);
        return;
      }
      await recordGeolocConsent();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Erreur', `Impossible d'enregistrer votre consentement. Réessayez.\n${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Géolocalisation</Text>
      <Text style={styles.body}>
        KBS Assistance a besoin de votre position au moment de la prise et de la fin de service,
        uniquement pendant vos plages de travail, pour horodater et localiser votre main courante.
        Aucune localisation n'est effectuée en dehors de vos périodes de service.
      </Text>
      {permissionDenied && (
        <Text style={styles.error}>
          L'autorisation de localisation est nécessaire pour utiliser l'application. Activez-la
          dans les réglages du téléphone puis réessayez.
        </Text>
      )}
      <Pressable style={styles.button} onPress={handleAccept} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>J'accepte</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 15, color: '#333', lineHeight: 22 },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#dc2626' },
});
