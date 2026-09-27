import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { AppTheme } from '@/constants/themes';

/** A tiny mock of the app (banner, a post, the tab bar) painted in a given theme. */
export function ThemePreview({ theme }: { theme: AppTheme }) {
  const { colors, art } = theme;
  const gradient = (suffix: string) => `${theme.id}-${suffix}`;

  return (
    <View style={[styles.phone, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.banner}>
        <Svg width="100%" height="100%" viewBox="0 0 200 60" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <LinearGradient id={gradient('sky')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={art.skyTop} />
              <Stop offset="0.8" stopColor={art.skyMid} />
              <Stop offset="1" stopColor={art.skyBottom} />
            </LinearGradient>
            <LinearGradient id={gradient('sun')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={art.sunFrom} />
              <Stop offset="1" stopColor={art.sunTo} />
            </LinearGradient>
            <LinearGradient id={gradient('ground')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={art.groundTop} />
              <Stop offset="1" stopColor={art.groundBottom} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={200} height={42} fill={`url(#${gradient('sky')})`} />
          <Circle cx={140} cy={40} r={17} fill={`url(#${gradient('sun')})`} />
          {[30, 34, 38].map((y) => (
            <Rect key={y} x={120} y={y} width={40} height={1.5} fill={art.skyMid} />
          ))}
          <Rect x={0} y={42} width={200} height={18} fill={`url(#${gradient('ground')})`} />
          {[-60, -30, 0, 30, 60].map((dx) => (
            <Line key={dx} x1={100 + dx / 6} y1={42} x2={100 + dx * 2} y2={60} stroke={art.grid} strokeWidth={0.6} opacity={0.6} />
          ))}
          <Line x1={0} y1={42} x2={200} y2={42} stroke={art.grid} strokeWidth={0.8} />
        </Svg>
        <Text style={[styles.brand, { color: colors.text }]}>REVAPP</Text>
      </View>

      <View style={[styles.post, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.postHeader}>
          <View style={[styles.avatar, { backgroundColor: art.avatarTints[0] }]} />
          <View style={[styles.line, { backgroundColor: colors.text, width: 44 }]} />
        </View>
        <View style={[styles.photo, { backgroundColor: colors.imagePlaceholder }]} />
        <View style={styles.actions}>
          <Ionicons name="heart" size={12} color={colors.tint} />
          <Ionicons name="car-sport-outline" size={13} color={colors.text} />
          <View style={styles.flex} />
          <View style={[styles.button, { backgroundColor: colors.tint }]}>
            <Text style={[styles.buttonText, { color: colors.onTint }]}>Share</Text>
          </View>
        </View>
      </View>

      <View style={[styles.tabBar, { borderTopColor: colors.border }]}>
        <Ionicons name="home" size={11} color={colors.tabIconSelected} />
        <Ionicons name="calendar-outline" size={11} color={colors.tabIconDefault} />
        <View style={[styles.postButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="add" size={12} color={colors.onTint} />
        </View>
        <Ionicons name="chatbubbles-outline" size={11} color={colors.tabIconDefault} />
        <Ionicons name="person-outline" size={11} color={colors.tabIconDefault} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    width: 128,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  banner: {
    height: 44,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  brand: {
    position: 'absolute',
    left: 8,
    top: 6,
    fontSize: 10,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  post: {
    margin: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 5,
    gap: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    height: 4,
    borderRadius: 2,
    opacity: 0.8,
  },
  photo: {
    height: 52,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  flex: {
    flex: 1,
  },
  button: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  buttonText: {
    fontSize: 7,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 5,
  },
  postButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
});
