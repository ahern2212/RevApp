import { File, Paths } from 'expo-file-system';
import { DevSettings, Platform } from 'react-native';

// The chosen color theme is read synchronously while the app starts (before any screen's
// styles are built), so it has to live somewhere readable without `await`:
// localStorage on the web, a tiny file in the app's documents folder on phones.
const KEY = 'revapp.theme';
const FILE_NAME = 'revapp-theme.txt';

function themeFile(): File {
  return new File(Paths.document, FILE_NAME);
}

/** The theme id saved on this device, or null. Safe to call at module load. */
export function readSavedThemeId(): string | null {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    }
    const file = themeFile();
    return file.exists ? file.textSync().trim() || null : null;
  } catch {
    return null;
  }
}

export function saveThemeId(id: string): void {
  if (Platform.OS === 'web') {
    localStorage.setItem(KEY, id);
    return;
  }
  const file = themeFile();
  if (!file.exists) file.create();
  file.write(id);
}

/**
 * Restarts the app so every screen is rebuilt with the new colors. Returns false where a
 * restart isn't possible from JavaScript (store builds without expo-updates) — the caller
 * then asks the user to reopen the app.
 */
export function reloadApp(): boolean {
  if (Platform.OS === 'web') {
    window.location.reload();
    return true;
  }
  if (__DEV__) {
    DevSettings.reload();
    return true;
  }
  return false;
}
