import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { PressableScale } from '@/components/PressableScale';
import Colors, { art } from '@/constants/Colors';
import { useActivity } from '@/context/ActivityContext';
import { useMessages } from '@/context/MessagesContext';

const BANNER_HEIGHT = 128;
const HORIZON = 92; // distance from the top of the banner (below the safe area) to the horizon
const SUN_RADIUS = 40;
const MOUNTAIN_PEAKS = [6, 16, 9, 21, 12, 18, 7, 15, 10, 19, 8];

// Retro sun: solid on top, then stripes that thin out toward the horizon.
function sunBands(cy: number, horizon: number) {
  const bands = [{ y: cy - SUN_RADIUS, h: SUN_RADIUS - 8 }];
  let y = cy - 8;
  for (let i = 0; y < horizon; i++) {
    const band = Math.max(2, 7 - i * 1.5);
    y += 2 + i * 1.5;
    bands.push({ y, h: band });
    y += band;
  }
  return bands;
}

function mountainsPath(width: number, horizon: number) {
  const step = width / (MOUNTAIN_PEAKS.length - 1);
  const peaks = MOUNTAIN_PEAKS.map((h, i) => `L${i * step},${horizon - h}`).join(' ');
  return `M0,${horizon} ${peaks} L${width},${horizon} Z`;
}

function SunsetScene({ width, height, top }: { width: number; height: number; top: number }) {
  const horizon = top + HORIZON;
  const sunX = Math.min(width * 0.68, width - 70);
  const sunY = horizon - 4;
  const vanishX = width / 2;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={art.skyTop} />
          <Stop offset="0.7" stopColor={art.skyMid} />
          <Stop offset="1" stopColor={art.skyBottom} />
        </LinearGradient>
        <LinearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={art.sunFrom} />
          <Stop offset="1" stopColor={art.sunTo} />
        </LinearGradient>
        <LinearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={art.groundTop} />
          <Stop offset="1" stopColor={art.groundBottom} />
        </LinearGradient>
        <ClipPath id="sunBands">
          {sunBands(sunY, horizon).map((band) => (
            <Rect
              key={band.y}
              x={sunX - SUN_RADIUS}
              y={band.y}
              width={SUN_RADIUS * 2}
              height={band.h}
            />
          ))}
        </ClipPath>
      </Defs>

      <Rect x={0} y={0} width={width} height={horizon} fill="url(#sky)" />
      <Circle cx={sunX} cy={sunY} r={SUN_RADIUS} fill="url(#sun)" clipPath="url(#sunBands)" />
      <Path d={mountainsPath(width, horizon)} fill={art.mountains} opacity={0.45} />

      <Rect x={0} y={horizon} width={width} height={height - horizon} fill="url(#ground)" />
      <G stroke={art.grid} strokeWidth={1} opacity={0.55}>
        {Array.from({ length: 15 }, (_, i) => i - 7).map((i) => (
          <Line
            key={`v${i}`}
            x1={vanishX + i * 6}
            y1={horizon}
            x2={vanishX + i * (width / 6)}
            y2={height}
          />
        ))}
        {[0.12, 0.3, 0.55, 0.85].map((t) => {
          const y = horizon + (height - horizon) * t;
          return <Line key={`h${t}`} x1={0} y1={y} x2={width} y2={y} />;
        })}
      </G>
      <Line x1={0} y1={horizon} x2={width} y2={horizon} stroke={art.grid} strokeWidth={1.5} />

      <G transform={`translate(${Math.max(16, width * 0.14)}, ${horizon + 8}) scale(1.15)`}>
        <G stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round" opacity={0.75}>
          <Line x1={86} y1={8} x2={108} y2={8} />
          <Line x1={84} y1={13} x2={100} y2={13} />
          <Line x1={88} y1={18} x2={112} y2={18} />
        </G>
        <Path
          d="M2,18 L6,12 Q10,10 20,9 L30,3 Q34,1 44,1 L54,2 Q58,3 64,9 L74,11 Q79,12 79,16 L79,19 L2,19 Z"
          fill={Colors.light.text}
        />
        <Path d="M31,4 L44,2.5 L52,3.5 L57,8.5 L27,8.5 Z" fill={art.glass} opacity={0.85} />
        <Rect x={2} y={13} width={5} height={2.5} rx={1} fill={art.glass} />
        <Rect x={75} y={13} width={4} height={2.5} rx={1} fill={art.accentSoft} />
        {[18, 62].map((cx) => (
          <G key={cx}>
            <Circle cx={cx} cy={19} r={5} fill={Colors.light.text} stroke={art.accentSoft} strokeWidth={1} />
            <Circle cx={cx} cy={19} r={2} fill={art.glass} />
          </G>
        ))}
      </G>
    </Svg>
  );
}

/** Full header height including the status bar area; the feed uses it to offset its content. */
export function useFeedHeaderHeight(): number {
  return useSafeAreaInsets().top + BANNER_HEIGHT;
}

export function FeedHeader() {
  const router = useRouter();
  const { unread } = useActivity();
  const { unreadCount: unreadChats } = useMessages();
  const { top } = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const height = useFeedHeaderHeight();

  return (
    <View
      style={[styles.wrap, { height }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <SunsetScene width={width} height={height} top={top} />
        </View>
      ) : null}
      <View style={[styles.inner, { paddingTop: top + 10 }]}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand} accessibilityRole="header">
            RevApp
          </Text>
          <Text style={styles.tagline} numberOfLines={1}>
             Lets see the builds
          </Text>
        </View>
        <View style={styles.buttons}>
          <PressableScale
            onPress={() => router.push('/search')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Search"
            style={[styles.action, styles.actionLight]}>
            <Ionicons name="search" size={20} color={Colors.light.tint} />
          </PressableScale>
          <PressableScale
            onPress={() => router.push('/activity')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Activity, ${unread} new` : 'Activity'}
            style={[styles.action, styles.actionLight]}>
            <Ionicons name="heart-outline" size={22} color={Colors.light.tint} />
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </PressableScale>
          <PressableScale
            onPress={() => router.push('/inbox')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={unreadChats > 0 ? `Messages, ${unreadChats} unread` : 'Messages'}
            style={[styles.action, styles.actionLight]}>
            <Ionicons name="paper-plane-outline" size={20} color={Colors.light.tint} />
            {unreadChats > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadChats > 9 ? '9+' : unreadChats}</Text>
              </View>
            ) : null}
          </PressableScale>
          <PressableScale
            onPress={() => router.push('/post')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="New post"
            style={styles.action}>
            <Ionicons name="add" size={24} color={Colors.light.onTint} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: art.skyMid,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  brandBlock: {
    flex: 1,
    marginRight: 10,
  },
  brand: {
    color: Colors.light.text,
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 3,
    textShadowColor: Colors.light.surface,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  tagline: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  action: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLight: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.tint,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: Colors.light.danger,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
});
