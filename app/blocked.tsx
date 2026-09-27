import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
import { showError } from '@/lib/confirm';
import { type BlockedUser, fetchBlocked, unblockUser } from '@/lib/safety';

/** Everyone the signed-in user has blocked, with an Unblock button for each. */
export default function BlockedScreen() {
  const router = useRouter();
  const { refresh } = useGarage();
  const [people, setPeople] = useState<BlockedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBlocked()
      .then((list) => !cancelled && setPeople(list))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const unblock = async (person: BlockedUser) => {
    setBusyId(person.id);
    try {
      await unblockUser(person.id);
      setPeople((current) => (current ?? []).filter((p) => p.id !== person.id));
      refresh(); // their posts come back to the feed
    } catch (err) {
      showError('Could not unblock', err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={people ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <Text style={styles.intro}>
            Blocked drivers can’t see your posts, comments, threads or listings, and you won’t see
            theirs. They aren’t told when you block or unblock them.
          </Text>
        }
        ListEmptyComponent={
          error ? (
            <Text style={styles.empty}>{error}</Text>
          ) : people === null ? (
            <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
          ) : (
            <Text style={styles.empty}>You haven’t blocked anyone.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/user/[userId]', params: { userId: item.id, name: item.username } })
              }
              accessibilityRole="link"
              style={styles.person}>
              <Avatar name={item.username} userId={item.id} size={40} />
              <Text style={styles.username}>{item.username}</Text>
            </Pressable>
            <Pressable
              onPress={() => unblock(item)}
              disabled={busyId === item.id}
              accessibilityRole="button"
              accessibilityLabel={`Unblock ${item.username}`}
              style={[styles.unblock, busyId === item.id && styles.disabled]}>
              <Text style={styles.unblockText}>Unblock</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingVertical: 8,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  intro: {
    color: Colors.light.muted,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  person: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  username: {
    flex: 1,
    color: Colors.light.text,
    fontWeight: '700',
  },
  unblock: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  disabled: {
    opacity: 0.4,
  },
  unblockText: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  loading: {
    marginTop: 48,
  },
  empty: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
});
