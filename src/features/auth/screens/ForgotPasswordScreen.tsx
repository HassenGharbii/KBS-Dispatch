import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { colors, spacing, radius, cardShadow } from '../../../theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit() {
    setStatus('sending');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'kbsmaincourante://reset-password',
    });
    setStatus(error ? 'error' : 'sent');
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="key" size={22} color={colors.primary} />
      </View>
      <Text style={styles.description}>
        Saisissez votre email professionnel : un lien de réinitialisation vous sera envoyé.
      </Text>
      <View style={styles.inputWrapper}>
        <Feather name="mail" size={16} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoComplete="off"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>
      <Pressable style={styles.button} onPress={handleSubmit} disabled={status === 'sending' || !email.trim()}>
        {status === 'sending' ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <>
            <Feather name="send" size={16} color={colors.textOnPrimary} />
            <Text style={styles.buttonText}>Envoyer le lien</Text>
          </>
        )}
      </Pressable>
      {status === 'sent' && (
        <View style={styles.successBox}>
          <Feather name="check-circle" size={15} color={colors.success} />
          <Text style={styles.success}>Email envoyé, vérifiez votre boîte de réception.</Text>
        </View>
      )}
      {status === 'error' && (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={15} color={colors.danger} />
          <Text style={styles.error}>Une erreur est survenue. Réessayez.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  description: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.textPrimary },
  button: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    ...cardShadow,
  },
  buttonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  success: { color: colors.success, fontSize: 13, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  error: { color: colors.danger, fontSize: 13, fontWeight: '600' },
});
