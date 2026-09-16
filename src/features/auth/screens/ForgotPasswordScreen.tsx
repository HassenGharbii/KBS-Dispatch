import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  async function handleSubmit() {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'kbsmaincourante://reset-password',
    });
    setStatus(error ? 'error' : 'sent');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Saisissez votre email professionnel : un lien de réinitialisation vous sera envoyé.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Pressable style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Envoyer le lien</Text>
      </Pressable>
      {status === 'sent' && (
        <Text style={styles.success}>Email envoyé, vérifiez votre boîte de réception.</Text>
      )}
      {status === 'error' && <Text style={styles.error}>Une erreur est survenue. Réessayez.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  description: { fontSize: 15, color: '#444', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, fontSize: 16 },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  success: { color: '#16a34a', marginTop: 12 },
  error: { color: '#dc2626', marginTop: 12 },
});
