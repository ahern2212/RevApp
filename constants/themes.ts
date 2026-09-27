// App color themes. The active one is chosen in constants/Colors.ts; the others are shown on
// the "Vote on app colors" screen. Ids must match supabase/migrations/20260927110000_theme_votes.sql.
//
// `colors` are UI roles used by every screen; `art` are the illustration colors used by the
// feed banner, avatars and the Post button. Button text on `tint` uses `onTint`, chosen per
// theme so it meets WCAG AA contrast.

export type ThemeColors = {
  text: string;
  muted: string;
  placeholder: string;
  background: string;
  card: string;
  border: string;
  tint: string;
  onTint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  avatar: string;
  imagePlaceholder: string;
  danger: string;
};

export type ThemeArt = {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  sunFrom: string;
  sunTo: string;
  mountains: string;
  groundTop: string;
  groundBottom: string;
  grid: string;
  glass: string;
  accentSoft: string;
  buttonFrom: string;
  buttonTo: string;
  avatarTints: string[];
};

export type AppTheme = {
  id: 'purple90s' | 'sunsetDrive' | 'racingGreen' | 'gulfLivery' | 'midnightNeon';
  name: string;
  tagline: string;
  dark: boolean;
  swatches: string[];
  colors: ThemeColors;
  art: ThemeArt;
};

export const THEMES: AppTheme[] = [
  {
    id: 'purple90s',
    name: "Purple 90's",
    tagline: 'Ice-cold blues and 90s purple (current look)',
    dark: false,
    swatches: ['#a0d2eb', '#e5eaf5', '#d0bdf4', '#8458B3', '#a28089'],
    colors: {
      text: '#2d1f47',
      muted: '#6e5560',
      placeholder: '#a28089',
      background: '#e5eaf5',
      card: 'rgba(255, 255, 255, 0.7)',
      border: 'rgba(132, 88, 179, 0.2)',
      tint: '#8458B3',
      onTint: '#ffffff',
      tabIconDefault: '#6e5560',
      tabIconSelected: '#8458B3',
      avatar: '#d0bdf4',
      imagePlaceholder: '#a0d2eb',
      danger: '#b3261e',
    },
    art: {
      skyTop: '#a0d2eb',
      skyMid: '#d0bdf4',
      skyBottom: '#e5eaf5',
      sunFrom: '#8458B3',
      sunTo: '#a28089',
      mountains: '#8458B3',
      groundTop: '#8458B3',
      groundBottom: '#2d1f47',
      grid: '#a0d2eb',
      glass: '#a0d2eb',
      accentSoft: '#d0bdf4',
      buttonFrom: '#d0bdf4',
      buttonTo: '#5b3a86',
      avatarTints: ['#d0bdf4', '#a0d2eb', '#e6d3d8', '#dfe3f7'],
    },
  },
  {
    id: 'sunsetDrive',
    name: 'Sunset Drive',
    tagline: 'Synthwave oranges and hot pinks',
    dark: false,
    swatches: ['#ffb88c', '#de6262', '#c7432a', '#f9d423', '#3a1c32'],
    colors: {
      text: '#3a1c32',
      muted: '#7a4e62',
      placeholder: '#b08a98',
      background: '#fff4ec',
      card: 'rgba(255, 255, 255, 0.75)',
      border: 'rgba(199, 67, 42, 0.2)',
      tint: '#c7432a',
      onTint: '#ffffff',
      tabIconDefault: '#7a4e62',
      tabIconSelected: '#c7432a',
      avatar: '#ffd3b5',
      imagePlaceholder: '#ffb88c',
      danger: '#a3162b',
    },
    art: {
      skyTop: '#ffb88c',
      skyMid: '#de6262',
      skyBottom: '#fff4ec',
      sunFrom: '#f9d423',
      sunTo: '#ff4e50',
      mountains: '#7a2f4f',
      groundTop: '#7a2f4f',
      groundBottom: '#3a1c32',
      grid: '#ffb88c',
      glass: '#ffd3b5',
      accentSoft: '#ffd3b5',
      buttonFrom: '#f9d423',
      buttonTo: '#a3162b',
      avatarTints: ['#ffd3b5', '#ffe7a3', '#f7c6cf', '#fde2d2'],
    },
  },
  {
    id: 'racingGreen',
    name: 'Racing Green',
    tagline: 'British racing green, cream and gold',
    dark: false,
    swatches: ['#0f4d32', '#1e6f50', '#c9a227', '#f3efe0', '#7a9e7e'],
    colors: {
      text: '#10261d',
      muted: '#4f5f55',
      placeholder: '#8a9a8e',
      background: '#f3efe0',
      card: 'rgba(255, 253, 246, 0.8)',
      border: 'rgba(15, 77, 50, 0.2)',
      tint: '#0f4d32',
      onTint: '#ffffff',
      tabIconDefault: '#4f5f55',
      tabIconSelected: '#0f4d32',
      avatar: '#d8e5c9',
      imagePlaceholder: '#cfe3d4',
      danger: '#a3261e',
    },
    art: {
      skyTop: '#cfe3d4',
      skyMid: '#e9e3c7',
      skyBottom: '#f3efe0',
      sunFrom: '#c9a227',
      sunTo: '#9a7b1c',
      mountains: '#1e6f50',
      groundTop: '#1e6f50',
      groundBottom: '#10261d',
      grid: '#c9a227',
      glass: '#cfe3d4',
      accentSoft: '#d8e5c9',
      buttonFrom: '#1e6f50',
      buttonTo: '#082a1b',
      avatarTints: ['#d8e5c9', '#ecdca6', '#cfe3d4', '#e6e0cc'],
    },
  },
  {
    id: 'gulfLivery',
    name: 'Gulf Livery',
    tagline: 'The classic racing light blue and orange',
    dark: false,
    swatches: ['#6ecff6', '#f58025', '#ffffff', '#1b1b1b', '#bfe8fa'],
    colors: {
      text: '#1b1b1b',
      muted: '#4a5a63',
      placeholder: '#8aa0ab',
      background: '#eaf7fd',
      card: 'rgba(255, 255, 255, 0.8)',
      border: 'rgba(27, 27, 27, 0.14)',
      tint: '#f58025',
      onTint: '#1b1b1b',
      tabIconDefault: '#4a5a63',
      tabIconSelected: '#c85f0f',
      avatar: '#bfe8fa',
      imagePlaceholder: '#bfe8fa',
      danger: '#b3261e',
    },
    art: {
      skyTop: '#6ecff6',
      skyMid: '#bfe8fa',
      skyBottom: '#eaf7fd',
      sunFrom: '#f58025',
      sunTo: '#ffb070',
      mountains: '#3a9cc4',
      groundTop: '#3a9cc4',
      groundBottom: '#1b1b1b',
      grid: '#f58025',
      glass: '#bfe8fa',
      accentSoft: '#bfe8fa',
      buttonFrom: '#ffb070',
      buttonTo: '#d9661a',
      avatarTints: ['#bfe8fa', '#ffd9b8', '#dff3fb', '#ffe9d6'],
    },
  },
  {
    id: 'midnightNeon',
    name: 'Midnight Neon',
    tagline: 'Dark mode with neon pink and cyan',
    dark: true,
    swatches: ['#0d0221', '#0f084b', '#26408b', '#ff3cac', '#2de2e6'],
    colors: {
      text: '#f2eaff',
      muted: '#b8a9d9',
      placeholder: '#7d6fa3',
      background: '#0d0221',
      card: 'rgba(38, 64, 139, 0.25)',
      border: 'rgba(45, 226, 230, 0.2)',
      tint: '#ff3cac',
      onTint: '#0d0221',
      tabIconDefault: '#b8a9d9',
      tabIconSelected: '#ff3cac',
      avatar: '#2b1b5e',
      imagePlaceholder: '#26408b',
      danger: '#ff6b6b',
    },
    art: {
      skyTop: '#0f084b',
      skyMid: '#26408b',
      skyBottom: '#0d0221',
      sunFrom: '#ff3cac',
      sunTo: '#f9c80e',
      mountains: '#2b1b5e',
      groundTop: '#1a0f3a',
      groundBottom: '#0d0221',
      grid: '#2de2e6',
      glass: '#2de2e6',
      accentSoft: '#2b1b5e',
      buttonFrom: '#ff3cac',
      buttonTo: '#7b2cbf',
      avatarTints: ['#2b1b5e', '#1f3a6e', '#3d1d52', '#233060'],
    },
  },
];

export function themeById(id: string): AppTheme | undefined {
  return THEMES.find((theme) => theme.id === id);
}
