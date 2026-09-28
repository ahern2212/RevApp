import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useGarage } from '@/context/GarageContext';
import { showError } from '@/lib/confirm';
import {
  fetchNotificationSettings,
  type NotificationSettings,
  PUSH_KINDS,
  type PushKind,
  saveNotificationSettings,
} from '@/lib/notificationSettings';

/** Switches for which events send a push to your phone. */
export default function NotificationSettingsScreen() {
  const { user } = useGarage();
  const [settings, setSettings] = useState<NotificationSettings | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchNotificationSettings()
      .then((next) => !cancelled && setSettings(next))
      .catch((error) => {
        console.warn('Failed to load notification settings', error);
        if (!cancelled) setSettings(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (key: PushKind, value: boolean) => {
    if (!user || !settings) return;
    const previous = settings;
    const next = { ...settings, [key]: value };
    setSettings(next); // optimistic; undone if saving fails
    try {
      await saveNotificationSettings(user.id, next);
    } catch (error) {
      setSettings(previous);
      showError('Could not save', error);
    }
  };

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView style={styles.list} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Choose what buzzes your phone (with the car horn). Everything still shows up in Activity
          and your inbox.
        </Text>
        {settings === undefined ? (
          <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
        ) : settings === null ? (
          <Text style={styles.intro}>Notification settings need the latest database update.</Text>
        ) : (
          <View style={styles.card}>
            {PUSH_KINDS.map(({ key, label, detail }, index) => (
              <View key={key} style={[styles.row, index > 0 && styles.divider]}>
                <View style={styles.text}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.detail}>{detail}</Text>
                </View>
                <Switch
                  value={settings[key]}
                  onValueChange={(value) => toggle(key, value)}
                  trackColor={{ true: Colors.light.tint, false: Colors.light.border }}
                  accessibilityLabel={`${label} push notifications`}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  list: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  intro: {
    color: Colors.light.muted,
    lineHeight: 20,
  },
  loading: {
    marginTop: 24,
  },
  card: {
    ...glass,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.border,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: Colors.light.text,
    fontWeight: '700',
    fontSize: 15,
  },
  detail: {
    color: Colors.light.muted,
    fontSize: 13,
  },
});
