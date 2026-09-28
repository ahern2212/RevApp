import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import Colors, { art } from '@/constants/Colors';
import { useProfile } from '@/context/ProfilesContext';

// Soft tints from the active theme; the letter uses the theme's text color on top.
const BACKGROUNDS = art.avatarTints;

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return BACKGROUNDS[Math.abs(hash) % BACKGROUNDS.length];
}

type Props = {
  name: string;
  /** When given, shows the user's profile picture if they have one. */
  userId?: string;
  size?: number;
  /** Overrides the cached picture (e.g. a just-picked photo in the editor). */
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
};

/** Profile picture, or a letter avatar with a color that stays the same for each username. */
export function Avatar({ name, userId, size = 36, uri, style }: Props) {
  const profile = useProfile(userId);
  const imageUri = uri !== undefined ? uri : profile?.avatarUri;
  const circle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      style={[styles.circle, circle, { backgroundColor: colorFor(name) }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {imageUri ? (
        <Image source={{ uri: imageUri }} placeholder="blurhash" style={circle} contentFit="cover" transition={150} />
      ) : (
        <Text style={[styles.letter, { fontSize: Math.round(size * 0.42) }]}>
          {name.slice(0, 1).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  letter: {
    color: Colors.light.text,
    fontWeight: '800',
  },
});
