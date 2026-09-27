import { FlatList, StyleSheet } from 'react-native';

import { PostCard } from '@/components/PostCard';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';

export default function FeedScreen() {
  const { posts, user, toggleLike } = useGarage();

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
      style={styles.list}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingBottom: 32,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
});
