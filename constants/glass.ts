import type { ViewStyle } from 'react-native';

import Colors, { activeTheme } from './Colors';

/**
 * Frosted-glass card: translucent fill, bright hairline edge and a soft shadow. Spread it
 * into a StyleSheet entry and add the radius/padding you need. (No live blur here — dozens of
 * blur views in a scrolling list stutter on phones; floating UI uses <BlurView> instead.)
 */
export const glass = {
  backgroundColor: Colors.light.card,
  borderWidth: 1,
  borderColor: Colors.light.glassBorder,
  shadowColor: activeTheme.dark ? '#000000' : Colors.light.tint,
  shadowOpacity: activeTheme.dark ? 0.4 : 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} satisfies ViewStyle;

/** Blur tint that matches the active theme for <BlurView>. */
export const blurTint = activeTheme.dark ? 'dark' : 'light';
