import { readSavedThemeId } from '@/lib/themeStore';

import { type AppTheme, THEMES } from './themes';

// ▶ The default theme for everyone (e.g. switch to the community vote winner here).
//   Options: 'purple90s' | 'sunsetDrive' | 'racingGreen' | 'gulfLivery' | 'midnightNeon'.
export const DEFAULT_THEME_ID: AppTheme['id'] = 'purple90s';

// A user's own pick (made by voting on the App colors screen) overrides the default on
// their device. It's read once at startup — picking a theme restarts the app.
const savedId = readSavedThemeId();

export const activeTheme: AppTheme =
  THEMES.find((t) => t.id === savedId) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID) ?? THEMES[0];

/** Illustration colors for the active theme (feed banner, avatars, Post button). */
export const art = activeTheme.art;

/** UI colors for the active theme. (Kept under `light` so existing `Colors.light.x` reads work.) */
export default {
  light: activeTheme.colors,
};
