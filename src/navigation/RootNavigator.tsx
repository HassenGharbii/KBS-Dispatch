import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { registerPushToken } from '../lib/pushNotifications';
import { AuthStack } from './AuthStack';
import { AgentStack } from './AgentStack';
import { DirigeantStack } from './DirigeantStack';
import ConsentScreen from '../features/auth/screens/ConsentScreen';
import UnknownRoleScreen from '../features/auth/screens/UnknownRoleScreen';

export function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  // Registers/refreshes the push token whenever a signed-in profile becomes
  // available -- covers both first login and re-opening the app after a
  // token rotation (Expo push tokens can change, e.g. after reinstall).
  useEffect(() => {
    if (status === 'signedIn' && profile?.id) {
      registerPushToken(profile.id);
    }
  }, [status, profile?.id]);

  return (
    <NavigationContainer>
      {status === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      )}
      {status === 'signedOut' && <AuthStack />}
      {status === 'signedIn' && profile?.role === 'agent' && profile.geolocConsentAt && (
        <AgentStack />
      )}
      {status === 'signedIn' && profile?.role === 'agent' && !profile.geolocConsentAt && (
        <ConsentScreen />
      )}
      {status === 'signedIn' && profile?.role === 'dirigeant' && <DirigeantStack />}
      {status === 'signedIn' &&
        (!profile || (profile.role !== 'agent' && profile.role !== 'dirigeant')) && (
          <UnknownRoleScreen />
        )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
