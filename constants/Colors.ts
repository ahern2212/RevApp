import { type AppTheme, THEMES } from './themes';

// ▶ To switch the whole app to another theme (e.g. the community vote winner), change this id.
//   Options: 'purple90s' | 'sunsetDrive' | 'racingGreen' | 'gulfLivery' | 'midnightNeon'.
//   ('midnightNeon' is dark: also set "userInterfaceStyle": "dark" in app.json.)
const ACTIVE_THEME_ID: AppTheme['id'] = 'purple90s';

export const activeTheme: AppTheme = THEMES.find((t) => t.id === ACTIVE_THEME_ID) ?? THEMES[0];

/** Illustration colors for the active theme (feed banner, avatars, Post button). */
export const art = activeTheme.art;

// The app is single-theme at runtime; both keys point at it so Themed components work.
export default {
  light: activeTheme.colors,
  dark: activeTheme.colors,
};
