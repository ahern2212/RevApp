// "Minimal Colors – Purple 90's" palette by Duminda Perera.
export const palette = {
  iceCold: '#a0d2eb',
  freezePurple: '#e5eaf5',
  mediumPurple: '#d0bdf4',
  purplePain: '#8458B3',
  heavyPurple: '#a28089',
};

// The palette has no dark tone, so body text and muted text use deeper shades
// of its purples to stay readable (WCAG AA) on the Freeze Purple background.
const theme = {
  text: '#2d1f47',
  muted: '#6e5560',
  placeholder: palette.heavyPurple,
  background: palette.freezePurple,
  card: 'rgba(255, 255, 255, 0.7)',
  border: 'rgba(132, 88, 179, 0.2)',
  tint: palette.purplePain,
  onTint: '#ffffff',
  tabIconDefault: '#6e5560',
  tabIconSelected: palette.purplePain,
  avatar: palette.mediumPurple,
  imagePlaceholder: palette.iceCold,
  danger: '#b3261e',
};

// The app is light-only; both keys point at the same theme so Themed components work.
export default {
  light: theme,
  dark: theme,
};
