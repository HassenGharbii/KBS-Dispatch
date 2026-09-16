import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Real remote push delivery (mission proposed/accepted/refused/cancelled),
// distinct from src/lib/localNotifications.ts's on-device scheduled alerts
// (3h reminder, departure alert) which don't need a server round-trip at all.
// Requires an EAS project (for the push token) and Firebase/FCM credentials
// uploaded to Expo for real delivery -- until that's configured, this
// no-ops quietly rather than blocking anything else in the app.
export async function registerPushToken(userId: string): Promise<void> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log('[pushNotifications] no EAS projectId configured yet — skipping registration');
      return;
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  } catch (err) {
    console.log(
      '[pushNotifications] registration failed:',
      err instanceof Error ? err.message : String(err)
    );
  }
}
