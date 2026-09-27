import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

// Must match the channelId and sound the database sends in
// supabase/migrations/20260927030000_push_notifications.sql.
const ACTIVITY_CHANNEL = 'activity';
const HORN_SOUND = 'car_horn.wav';

// Push needs a real phone running a development or store build. Expo Go no longer
// supports remote push on Android, and the web has no Expo push support.
export const pushSupported =
  Platform.OS !== 'web' &&
  Device.isDevice &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

if (pushSupported) {
  // While the app is open, the in-app toaster honks and shows its own banner,
  // so don't show a second system banner on top of it.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let registeredToken: string | null = null;

/** Asks for permission and saves this device's push token for the signed-in user. */
export async function registerForPush(): Promise<void> {
  if (!pushSupported) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ACTIVITY_CHANNEL, {
      name: 'Likes & comments',
      importance: Notifications.AndroidImportance.HIGH,
      sound: HORN_SOUND,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: Colors.light.tint,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('Push disabled: no EAS projectId in app.json (run `npx eas-cli init`).');
    return;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw error;
  registeredToken = token;
}

/** Stops pushes to this device; call before signing out. */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  const { error } = await supabase.rpc('unregister_push_token', { p_token: registeredToken });
  if (error) throw error;
  registeredToken = null;
}

/** Calls `onOpen(postId)` when the user taps a push, including one that launched the app. */
export function onPushOpened(onOpen: (postId: string) => void): () => void {
  if (!pushSupported) return () => {};

  const handle = (response: Notifications.NotificationResponse | null) => {
    const postId = response?.notification.request.content.data?.postId;
    if (typeof postId !== 'string') return;
    Notifications.clearLastNotificationResponse();
    onOpen(postId);
  };

  handle(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
