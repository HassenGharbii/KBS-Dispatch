import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Referenced by the `channelId` the Postgres trigger sends in each push
// payload (see supabase/migrations/..._mission_push_notifications.sql) --
// the channel's own settings (not the payload) are what actually control
// Android sound/heads-up/lock-screen behavior, so the two must stay in sync.
export const MISSIONS_CHANNEL_ID = 'missions';

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
      // MAX importance + PUBLIC lock-screen visibility is what makes Android
      // show this as a heads-up banner with full content and sound even
      // while the phone is locked -- DEFAULT importance (the previous
      // setting) only shows silently in the notification shade.
      await Notifications.setNotificationChannelAsync(MISSIONS_CHANNEL_ID, {
        name: 'Missions',
        importance: Notifications.AndroidImportance.MAX,
        // null (not the string 'default') -- the native module treats any
        // non-null string here as a custom sound *filename* to look up via
        // the config plugin's `sounds` array, logging a "not found" error if
        // it doesn't exist. null means "use the system's default sound",
        // which is what we actually want.
        sound: null,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
        bypassDnd: false,
        showBadge: true,
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
