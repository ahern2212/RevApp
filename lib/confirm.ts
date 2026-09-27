import { Alert, Platform } from 'react-native';

/**
 * Yes/no confirmation that works everywhere. React Native Web's Alert ignores buttons,
 * so the web falls back to the browser's confirm dialog.
 */
export function confirm(title: string, message: string, confirmLabel = 'OK'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) })
  );
}

/** Plain message (no buttons besides OK) that also shows on the web. */
export function showNotice(title: string, message: string): void {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

/** Error message that also shows on the web, where Alert.alert does nothing. */
export function showError(title: string, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Please try again.';
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
