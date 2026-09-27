import { FlatList, StyleSheet, Text } from 'react-native';

import { PostCard } from '@/components/PostCard';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';

export default function FeedScreen() {
  const { posts, user, toggleLike, refreshing, refresh } = useGarage();

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          liked={!!user && item.likedBy.includes(user.id)}
          onLike={() => toggleLike(item.id)}
        />
      )}
      refreshing={refreshing}
      onRefresh={refresh}
      ListEmptyComponent={
        <Text style={styles.empty}>No posts yet. Be the first to share your build.</Text>
      }
      style={styles.list}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingBottom: 32,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  empty: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
});
