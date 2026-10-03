import * as Notifications from 'expo-notifications';
import { appCache } from './mmkv';
import { getRoute, type LatLng } from './routing';

// Genuine on-device scheduled notifications (AlarmManager-backed on Android),
// not a server push -- these fire even if the app isn't foregrounded at the
// trigger time, without any Firebase/FCM setup. New-mission/accept/refuse
// notifications can't use this path (their timing isn't known ahead of
// time); those stay Realtime-only while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const REMINDER_LEAD_MS = 3 * 60 * 60 * 1000; // 3h before scheduled_start
const ARRIVAL_BUFFER_MS = 30 * 60 * 1000; // arrive 30min before scheduled_start
const END_WARNING_LEAD_MS = 10 * 60 * 1000; // 10min before scheduled_end
const notifKey = (missionId: string) => `missionNotif:${missionId}`;

interface StoredNotifIds {
  reminderId?: string;
  departureId?: string;
  endWarningId?: string;
  endId?: string;
}

function readStored(missionId: string): StoredNotifIds {
  const raw = appCache.getString(notifKey(missionId));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoredNotifIds;
  } catch {
    return {};
  }
}

function writeStored(missionId: string, ids: StoredNotifIds): void {
  appCache.set(notifKey(missionId), JSON.stringify(ids));
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export interface ScheduleRemindersInput {
  missionId: string;
  siteName: string;
  instructions: string | null;
  scheduledStart: string; // ISO
  home: LatLng;
  site: LatLng;
}

/**
 * Schedules the 3h-before reminder and the "leave home now" departure alert
 * for an accepted mission. Safe to call again after a reschedule (cancels
 * any previously-scheduled pair first). Silently skips a reminder whose
 * computed time has already passed.
 */
export async function scheduleMissionReminders(input: ScheduleRemindersInput): Promise<void> {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  await cancelMissionReminders(input.missionId);

  const startMs = new Date(input.scheduledStart).getTime();
  const now = Date.now();
  const ids: StoredNotifIds = {};

  const reminderAt = startMs - REMINDER_LEAD_MS;
  if (reminderAt > now) {
    ids.reminderId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Mission dans 3h — ${input.siteName}`,
        body: input.instructions || 'Consultez les consignes dans l\'application.',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminderAt) },
    });
  }

  const route = await getRoute(input.home, input.site);
  const routeDurationMs = (route?.durationSeconds ?? 0) * 1000;
  const departureAt = startMs - ARRIVAL_BUFFER_MS - routeDurationMs;
  if (departureAt > now) {
    ids.departureId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Quittez la maison maintenant',
        body: `Trajet estimé vers ${input.siteName} — départ nécessaire pour arriver à temps.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(departureAt) },
    });
  }

  writeStored(input.missionId, ids);
}

export async function cancelMissionReminders(missionId: string): Promise<void> {
  const ids = readStored(missionId);
  if (ids.reminderId) await Notifications.cancelScheduledNotificationAsync(ids.reminderId).catch(() => {});
  if (ids.departureId) await Notifications.cancelScheduledNotificationAsync(ids.departureId).catch(() => {});
  if (ids.endWarningId) await Notifications.cancelScheduledNotificationAsync(ids.endWarningId).catch(() => {});
  if (ids.endId) await Notifications.cancelScheduledNotificationAsync(ids.endId).catch(() => {});
  appCache.remove(notifKey(missionId));
}

/**
 * Schedules the "10 minutes left" and "mission ended" alerts, from the
 * moment the agent actually takes the service (not at accept time -- the
 * scheduled end can move if an overtime request is later accepted, so this
 * gets re-called after every acceptance via rescheduleEndOfMissionAlerts).
 * Keeps the reminder/departure ids already stored for this mission (call
 * sites run this after cancelMissionReminders cleared them, or standalone
 * on an overtime-extended end, so merge rather than overwrite).
 */
export async function scheduleEndOfMissionAlerts(
  missionId: string,
  siteName: string,
  scheduledEnd: string
): Promise<void> {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const existing = readStored(missionId);
  if (existing.endWarningId) await Notifications.cancelScheduledNotificationAsync(existing.endWarningId).catch(() => {});
  if (existing.endId) await Notifications.cancelScheduledNotificationAsync(existing.endId).catch(() => {});

  const endMs = new Date(scheduledEnd).getTime();
  const now = Date.now();
  const ids: StoredNotifIds = { ...existing, endWarningId: undefined, endId: undefined };

  const warningAt = endMs - END_WARNING_LEAD_MS;
  if (warningAt > now) {
    ids.endWarningId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Fin de mission dans 10 minutes',
        body: `${siteName} — pensez à terminer le service ou demander une prolongation.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(warningAt) },
    });
  }

  if (endMs > now) {
    ids.endId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Mission terminée',
        body: `${siteName} — l'heure de fin prévue est atteinte.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(endMs) },
    });
  }

  writeStored(missionId, ids);
}

/** Reschedules the departure alert only, e.g. for the in-app "+5 min" snooze. */
export async function snoozeDepartureAlert(missionId: string, siteName: string): Promise<void> {
  const ids = readStored(missionId);
  if (ids.departureId) {
    await Notifications.cancelScheduledNotificationAsync(ids.departureId).catch(() => {});
  }
  const newId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Quittez la maison maintenant',
      body: `Rappel — départ vers ${siteName}.`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 5 * 60 * 1000) },
  });
  writeStored(missionId, { ...ids, departureId: newId });
}
