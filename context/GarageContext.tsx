import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Post, User } from '@/types';

const USER_KEY = 'garage.user';
const POSTS_KEY = 'garage.posts';

const seedPosts: Post[] = [
  {
    id: 'seed-1',
    authorId: 'demo-maya',
    authorName: 'maya',
    imageUri:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80',
    caption: 'Night drive downtown. Exhaust note was illegal in three counties.',
    car: '1994 Mazda MX-5',
    createdAt: Date.now() - 1000 * 60 * 40,
    likedBy: ['demo-kai'],
  },
  {
    id: 'seed-2',
    authorId: 'demo-kai',
    authorName: 'kai',
    imageUri:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80',
    caption: 'Fresh wash. Still chasing that perfect stance.',
    car: 'Porsche 911',
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    likedBy: ['demo-maya', 'demo-rio'],
  },
  {
    id: 'seed-3',
    authorId: 'demo-rio',
    authorName: 'rio',
    imageUri:
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1200&q=80',
    caption: 'Sunday morning. No agenda except miles.',
    car: 'Toyota Supra',
    createdAt: Date.now() - 1000 * 60 * 60 * 22,
    likedBy: [],
  },
];

type GarageContextValue = {
  ready: boolean;
  user: User | null;
  posts: Post[];
  signIn: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
  addPost: (input: { imageUri: string; caption: string; car: string }) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
};

const GarageContext = createContext<GarageContextValue | null>(null);

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function GarageProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>(seedPosts);

  useEffect(() => {
    (async () => {
      try {
        const [rawUser, rawPosts] = await Promise.all([
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(POSTS_KEY),
        ]);
        if (rawUser) setUser(JSON.parse(rawUser) as User);
        if (rawPosts) {
          const parsed = JSON.parse(rawPosts) as Post[];
          if (Array.isArray(parsed) && parsed.length > 0) setPosts(parsed);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(POSTS_KEY, JSON.stringify(posts)).catch(() => {});
  }, [posts, ready]);

  const signIn = async (username: string) => {
    const next: User = { id: newId(), username: username.trim().toLowerCase() };
    setUser(next);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(next));
  };

  const signOut = async () => {
    setUser(null);
    await AsyncStorage.removeItem(USER_KEY);
  };

  const addPost = async (input: { imageUri: string; caption: string; car: string }) => {
    if (!user) return;
    const post: Post = {
      id: newId(),
      authorId: user.id,
      authorName: user.username,
      imageUri: input.imageUri,
      caption: input.caption.trim(),
      car: input.car.trim(),
      createdAt: Date.now(),
      likedBy: [],
    };
    setPosts((current) => [post, ...current]);
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    setPosts((current) =>
      current.map((post) => {
        if (post.id !== postId) return post;
        const liked = post.likedBy.includes(user.id);
        return {
          ...post,
          likedBy: liked
            ? post.likedBy.filter((id) => id !== user.id)
            : [...post.likedBy, user.id],
        };
      })
    );
  };

  const value = useMemo(
    () => ({ ready, user, posts, signIn, signOut, addPost, toggleLike }),
    [ready, user, posts]
  );

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
}

export function useGarage() {
  const ctx = useContext(GarageContext);
  if (!ctx) throw new Error('useGarage must be used inside GarageProvider');
  return ctx;
}
