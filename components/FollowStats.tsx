import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import type { FollowCounts, FollowList } from '@/lib/follows';

/** "12 followers · 30 following", each part opening its list. */
export function FollowStats({ counts, onOpen }: { counts: FollowCounts; onOpen: (list: FollowList) => void }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={() => onOpen('followers')} accessibilityRole="link" hitSlop={6}>
        <Text style={styles.text}>
          <Text style={styles.number}>{counts.followers}</Text> {counts.followers === 1 ? 'follower' : 'followers'}
        </Text>
      </Pressable>
      <Text style={styles.dot}>·</Text>
      <Pressable onPress={() => onOpen('following')} accessibilityRole="link" hitSlop={6}>
        <Text style={styles.text}>
          <Text style={styles.number}>{counts.following}</Text> following
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  text: {
    color: Colors.light.muted,
  },
  number: {
    color: Colors.light.text,
    fontWeight: '800',
  },
  dot: {
    color: Colors.light.muted,
  },
});
