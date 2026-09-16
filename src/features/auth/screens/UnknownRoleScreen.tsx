import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuthStore } from '../../../store/useAuthStore';

export default function UnknownRoleScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);
  // sub_admin/super_admin are valid roles, just not ones the mobile app has
  // a screen for (they use the web console) -- distinct from a genuinely
  // missing/misconfigured profile row.
  const isWebOnlyRole = profile?.role === 'sub_admin' || profile?.role === 'super_admin';

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {isWebOnlyRole
          ? "Ce compte utilise la console web, pas l'application mobile."
          : "Votre compte n'a pas de rôle valide. Contactez votre responsable."}
      </Text>
      <Pressable style={styles.button} onPress={() => signOut()}>
        <Text style={styles.buttonText}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  text: { fontSize: 16, textAlign: 'center' },
  button: { backgroundColor: '#1d4ed8', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
