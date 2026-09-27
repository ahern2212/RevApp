import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import Colors, { art } from '@/constants/Colors';

// Soft glows in the theme's colors that give the frosted-glass cards something to show
// through. Positioned in percentages so it fits any screen size.
const GLOWS = [
  { id: 'glowA', cx: '8%', cy: '14%', r: '60%', color: art.skyTop, opacity: 0.9 },
  { id: 'glowB', cx: '95%', cy: '45%', r: '58%', color: art.sunFrom, opacity: 0.35 },
  { id: 'glowC', cx: '20%', cy: '88%', r: '60%', color: art.accentSoft, opacity: 0.95 },
];

/** Full-screen theme-colored background for glass UI. Place it first inside a screen. */
export function GlassBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          {GLOWS.map((glow) => (
            <RadialGradient key={glow.id} id={glow.id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={glow.color} stopOpacity={glow.opacity} />
              <Stop offset="1" stopColor={glow.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={Colors.light.background} />
        {GLOWS.map((glow) => (
          <Circle key={glow.id} cx={glow.cx} cy={glow.cy} r={glow.r} fill={`url(#${glow.id})`} />
        ))}
      </Svg>
    </View>
  );
}
