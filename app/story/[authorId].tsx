import Ionicons from '@expo/vector-icons/Ionicons';
import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { OptionsSheet, type SheetOption } from '@/components/OptionsSheet';
import { confirmBlock, useReportSheet } from '@/components/SafetyActions';
import { useGarage } from '@/context/GarageContext';
import { useProfile } from '@/context/ProfilesContext';
import { confirm, showError, showNotice } from '@/lib/confirm';
import { MESSAGE_MAX, sendMessage, startConversation } from '@/lib/messages';
import {
  deleteStory,
  fetchStories,
  fetchStoryViewers,
  markStoryViewed,
  type Story,
  type StoryViewer,
} from '@/lib/stories';
import { timeAgo } from '@/lib/time';

const PHOTO_MS = 5000;
// A video that never reports its end (e.g. a format this device can't play) moves on anyway.
const VIDEO_TIMEOUT_MS = 65_000;

type SlideProps = {
  story: Story;
  progress: SharedValue<number>;
  paused: boolean;
  onDone: () => void;
};

/** Keeps the latest onDone without restarting timers when the parent re-renders. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

function PhotoSlide({ story, progress, paused, onDone }: SlideProps) {
  const done = useLatest(onDone);
  useEffect(() => {
    if (paused) return;
    progress.set(0);
    progress.set(withTiming(1, { duration: PHOTO_MS, easing: Easing.linear }));
    const timer = setTimeout(() => done.current(), PHOTO_MS);
    return () => {
      clearTimeout(timer);
      cancelAnimation(progress);
    };
  }, [story.id, paused, progress, done]);
  return <Image source={{ uri: story.imageUri }} style={StyleSheet.absoluteFill} contentFit="contain" />;
}

function VideoSlide({ story, progress, paused, onDone }: SlideProps) {
  const done = useLatest(onDone);
  const player = useVideoPlayer(story.videoUri, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
    // Browsers only autoplay muted video.
    p.muted = Platform.OS === 'web';
  });
  useEventListener(player, 'playToEnd', () => done.current());
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (player.duration > 0) progress.set(currentTime / player.duration);
  });

  useEffect(() => {
    if (paused) {
      player.pause();
      return;
    }
    player.play();
    const timer = setTimeout(() => done.current(), VIDEO_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [player, paused, done]);

  useEffect(() => {
    progress.set(0);
  }, [story.id, progress]);

  return (
    <>
      <Image source={{ uri: story.imageUri }} style={StyleSheet.absoluteFill} contentFit="contain" />
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        playsInline
      />
    </>
  );
}

function Bar({ state, progress }: { state: 'done' | 'active' | 'todo'; progress: SharedValue<number> }) {
  const fill = useAnimatedStyle(() => ({
    width: `${(state === 'done' ? 1 : state === 'active' ? progress.get() : 0) * 100}%`,
  }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

/** Full-screen story viewer: progress bars, tap left/right to move, auto-advances. */
export default function StoryScreen() {
  const { authorId, name } = useLocalSearchParams<{ authorId: string; name?: string }>();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { user } = useGarage();
  const author = useProfile(authorId);
  const [stories, setStories] = useState<Story[] | null>(null);
  const [index, setIndex] = useState(0);
  const [viewers, setViewers] = useState<{ storyId: string; list: StoryViewer[] } | null>(null);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [menu, setMenu] = useState<SheetOption[] | null>(null);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const progress = useSharedValue(0);
  const isMine = user?.id === authorId;
  const username = author?.username ?? name ?? 'driver';
  const story = stories?.[index];

  useEffect(() => {
    let cancelled = false;
    fetchStories(authorId)
      .then((list) => !cancelled && setStories(list))
      .catch((error) => {
        console.warn('Failed to load stories', error);
        if (!cancelled) setStories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authorId]);

  const close = useCallback(() => router.back(), [router]);

  const next = useCallback(() => {
    if (stories && index < stories.length - 1) setIndex(index + 1);
    else close();
  }, [stories, index, close]);

  const prev = () => setIndex((current) => Math.max(0, current - 1));

  // Count the view (others' stories), or load who viewed it (your own).
  const storyId = story?.id;
  useEffect(() => {
    if (!storyId) return;
    if (!isMine) {
      markStoryViewed(storyId).catch((error) => console.warn('Failed to mark story viewed', error));
      return;
    }
    let cancelled = false;
    fetchStoryViewers(storyId)
      .then((list) => !cancelled && setViewers({ storyId, list }))
      .catch((error) => console.warn('Failed to load viewers', error));
    return () => {
      cancelled = true;
    };
  }, [storyId, isMine]);

  const { openReport, reportSheet } = useReportSheet(close);

  // Replying to a story sends the author a direct message, like Instagram.
  const sendReply = async () => {
    const text = reply.trim();
    if (!text || sendingReply) return;
    setSendingReply(true);
    try {
      const conversationId = await startConversation(authorId);
      await sendMessage(conversationId, `Replied to your story: ${text}`);
      setReply('');
      setReplying(false);
      showNotice('Sent', `Your reply is in your chat with @${username}.`);
    } catch (error) {
      showError('Could not send', error);
    } finally {
      setSendingReply(false);
    }
  };

  const remove = async () => {
    if (!story || !stories) return;
    if (!(await confirm('Delete this story?', 'It will be removed right away.', 'Delete'))) return;
    try {
      await deleteStory(story);
      const rest = stories.filter((s) => s.id !== story.id);
      if (rest.length === 0) close();
      else {
        setStories(rest);
        setIndex(Math.min(index, rest.length - 1));
      }
    } catch (error) {
      showError('Could not delete', error);
    }
  };

  const openMenu = () =>
    story &&
    setMenu([
      {
        label: 'Report story',
        icon: 'flag-outline',
        destructive: true,
        onPress: () => openReport({ kind: 'story', id: story.id }),
      },
      {
        label: `Block @${username}`,
        icon: 'ban-outline',
        destructive: true,
        onPress: async () => {
          if (await confirmBlock(authorId, username)) close();
        },
      },
    ]);

  if (!stories) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color="#ffffff" style={styles.loading} />
      </View>
    );
  }
  if (!story) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.emptyText}>No live stories right now.</Text>
        <Pressable onPress={close} accessibilityRole="button" style={styles.emptyClose}>
          <Text style={styles.emptyCloseText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const paused = viewersOpen || menu !== null || replying;
  const viewerList = viewers?.storyId === story.id ? viewers.list : null;
  const Slide = story.videoUri ? VideoSlide : PhotoSlide;

  return (
    <View style={styles.screen}>
      <Slide key={story.id} story={story} progress={progress} paused={paused} onDone={next} />

      <Pressable style={styles.leftZone} onPress={prev} accessibilityRole="button" accessibilityLabel="Previous" />
      <Pressable style={styles.rightZone} onPress={next} accessibilityRole="button" accessibilityLabel="Next" />

      <View style={[styles.top, { paddingTop: top + 8 }]}>
        <View style={styles.bars}>
          {stories.map((s, i) => (
            <Bar key={s.id} state={i < index ? 'done' : i === index ? 'active' : 'todo'} progress={progress} />
          ))}
        </View>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: authorId, name: username } })}
            accessibilityRole="link"
            style={styles.author}>
            <Avatar name={username} userId={authorId} size={32} />
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.time}>{timeAgo(story.createdAt)}</Text>
          </Pressable>
          {isMine ? (
            <Pressable onPress={remove} hitSlop={10} accessibilityRole="button" accessibilityLabel="Delete story">
              <Ionicons name="trash-outline" size={22} color="#ffffff" />
            </Pressable>
          ) : (
            <Pressable onPress={openMenu} hitSlop={10} accessibilityRole="button" accessibilityLabel="Story options">
              <Ionicons name="ellipsis-horizontal" size={22} color="#ffffff" />
            </Pressable>
          )}
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={28} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      {isMine ? (
        <Pressable
          onPress={() => setViewersOpen(true)}
          accessibilityRole="button"
          style={[styles.seen, { bottom: bottom + 16 }]}>
          <Ionicons name="eye-outline" size={18} color="#ffffff" />
          <Text style={styles.seenText}>
            {viewerList ? `Seen by ${viewerList.length}` : 'Seen by …'}
          </Text>
        </Pressable>
      ) : null}

      {!isMine ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.replyWrap}>
          <View style={[styles.replyBar, { paddingBottom: bottom + 10 }]}>
            <TextInput
              value={reply}
              onChangeText={setReply}
              onFocus={() => setReplying(true)}
              onBlur={() => setReplying(false)}
              placeholder={`Reply to @${username}…`}
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              maxLength={MESSAGE_MAX - 40}
              returnKeyType="send"
              onSubmitEditing={sendReply}
              accessibilityLabel={`Reply to ${username}'s story`}
              style={styles.replyInput}
            />
            {reply.trim() ? (
              <Pressable
                onPress={sendReply}
                disabled={sendingReply}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Send reply">
                {sendingReply ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Ionicons name="paper-plane" size={24} color="#ffffff" />
                )}
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      ) : null}

      <Modal visible={viewersOpen} transparent animationType="slide" onRequestClose={() => setViewersOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setViewersOpen(false)} accessibilityLabel="Close viewers" />
        <View style={[styles.sheet, { paddingBottom: bottom + 12 }]}>
          <Text style={styles.sheetTitle}>Viewers</Text>
          <FlatList
            data={viewerList ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.sheetEmpty}>No views yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.viewerRow}>
                <Avatar name={item.username} userId={item.id} size={36} />
                <Text style={styles.viewerName}>{item.username}</Text>
              </View>
            )}
          />
        </View>
      </Modal>
      <OptionsSheet visible={menu !== null} options={menu ?? []} onClose={() => setMenu(null)} />
      {reportSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loading: {
    marginTop: 120,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 16,
  },
  emptyClose: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  emptyCloseText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  leftZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '30%',
  },
  rightZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '70%',
  },
  top: {
    pointerEvents: 'box-none',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    gap: 10,
  },
  bars: {
    pointerEvents: 'none',
    flexDirection: 'row',
    gap: 4,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  author: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    color: '#ffffff',
    fontWeight: '800',
  },
  time: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
  },
  seen: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  seenText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  replyWrap: {
    pointerEvents: 'box-none',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  replyInput: {
    flex: 1,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '60%',
    backgroundColor: '#1b1b1f',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 8,
  },
  sheetTitle: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  sheetEmpty: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginVertical: 16,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  viewerName: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
