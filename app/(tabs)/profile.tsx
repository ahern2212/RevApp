import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';

export default function ProfileScreen() {
  const { user, posts, signOut } = useGarage();
  const mine = posts.filter((post) => post.authorId === user?.id);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{user?.username.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.name}>{user?.username}</Text>
          <Text style={styles.meta}>{mine.length} posts</Text>
        </View>
      </View>
      <Pressable onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
      <View style={styles.grid}>
        {mine.map((post) => (
          <Image key={post.id} source={{ uri: post.imageUri }} style={styles.tile} contentFit="cover" />
        ))}
      </View>
      {mine.length === 0 ? (
        <Text style={styles.empty}>Your garage is empty. Post a car from the Post tab.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.light.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: Colors.light.tint,
    fontSize: 28,
    fontWeight: '800',
  },
  name: {
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: '800',
  },
  meta: {
    color: Colors.light.muted,
    marginTop: 4,
  },
  signOut: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
  },
  signOutText: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tile: {
    width: '32%',
    aspectRatio: 1,
    backgroundColor: Colors.light.card,
  },
  empty: {
    color: Colors.light.muted,
    marginTop: 24,
    lineHeight: 22,
  },
});
