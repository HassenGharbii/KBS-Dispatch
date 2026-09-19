import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/AuthStack';
import { useAuthStore } from '../../../store/useAuthStore';
import { colors, spacing, radius, typography, cardShadow } from '../../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (result.error) setError(result.error);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.logoCircle}>
          <Feather name="shield" size={32} color={colors.textOnPrimary} />
        </View>
        <Text style={styles.title}>KBS Main Courante</Text>
        <Text style={styles.subtitle}>Application agent</Text>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Feather name="mail" size={18} color={colors.textMuted} style={styles.inputIcon} />
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

          <View style={styles.inputWrapper}>
            <Feather name="lock" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithTrailingIcon]}
              placeholder="Mot de passe"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              autoComplete="off"
              value={password}
              onChangeText={setPassword}
            />
            <Pressable style={styles.trailingIcon} onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={15} color={colors.danger} />
              <Text style={styles.error}>{error}</Text>
            </View>
          )}

          <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <>
                <Feather name="log-in" size={17} color={colors.textOnPrimary} />
                <Text style={styles.buttonText}>Se connecter</Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.link}>Mot de passe oublié ?</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
    ...cardShadow,
  },
  title: { ...typography.title, textAlign: 'center', color: colors.textPrimary },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },
  form: { gap: spacing.md },
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
  inputWithTrailingIcon: { paddingRight: spacing.sm },
  trailingIcon: { padding: spacing.xs },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  error: { color: colors.danger, fontSize: 13, flexShrink: 1 },
  button: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    ...cardShadow,
  },
  buttonText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg, fontWeight: '600' },
});
