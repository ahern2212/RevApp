import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { MediaCarousel } from '@/components/MediaCarousel';
import { OptionsSheet, type SheetOption } from '@/components/OptionsSheet';
import { PostVideo } from '@/components/PostVideo';
import { RichText } from '@/components/RichText';
import { confirmBlock, useReportSheet } from '@/components/SafetyActions';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
import { confirm, showError } from '@/lib/confirm';
import {
  addComment,
  type Comment,
  COMMENT_MAX_LENGTH,
  deleteComment,
  fetchComments,
} from '@/lib/comments';
import { fetchPost } from '@/lib/posts';
import { timeAgo } from '@/lib/time';
import type { Post } from '@/types';

function CommentRow({
  name,
  userId,
  body,
  createdAt,
  onNamePress,
  onDelete,
  onLongPress,
}: {
  name: string;
  userId?: string;
  body: string;
  createdAt: number;
  onNamePress?: () => void;
  onDelete?: () => void;
  /** Report/block menu for other people's comments. */
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.row}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityHint={onLongPress ? 'Long-press to report or block' : undefined}
      accessibilityActions={onLongPress ? [{ name: 'longpress', label: 'Report or block' }] : undefined}
      onAccessibilityAction={onLongPress}>
      <Avatar name={name} userId={userId} size={32} />
      <View style={styles.rowBody}>
        <Text style={styles.body}>
          <Text style={styles.username} onPress={onNamePress}>
            {name}{' '}
          </Text>
          <RichText text={body} />
        </Text>
        <Text style={styles.meta}>{timeAgo(createdAt)}</Text>
      </View>
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Delete comment">
          <Ionicons name="trash-outline" size={18} color={Colors.light.muted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { posts, saved, user, adjustCommentCount, forgetPosts } = useGarage();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  // Use the copy the app already has (feed or saves); otherwise fetch it, e.g. when opened
  // from someone's profile grid or the Activity list.
  const known = posts.find((p) => p.id === postId) ?? saved.find((p) => p.id === postId);
  const knownId = known?.id;
  const [fetched, setFetched] = useState<Post | null>(null);
  const post = known ?? (fetched?.id === postId ? fetched : undefined);

  useEffect(() => {
    if (knownId) return;
    let cancelled = false;
    fetchPost(postId)
      .then((next) => !cancelled && setFetched(next))
      .catch((error) => console.warn('Failed to load post', error));
    return () => {
      cancelled = true;
    };
  }, [postId, knownId]);

  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [menu, setMenu] = useState<SheetOption[] | null>(null);

  const dropComments = (match: (comment: Comment) => boolean) => {
    const gone = (comments ?? []).filter(match).length;
    setComments((current) => (current ?? []).filter((c) => !match(c)));
    if (gone) adjustCommentCount(postId, -gone);
  };

  const { openReport, reportSheet } = useReportSheet((target) => {
    if (target.kind === 'comment') {
      dropComments((c) => c.id === target.id);
    } else {
      forgetPosts((p) => p.id === target.id);
      router.back();
    }
  });

  const block = async (authorId: string, authorName: string) => {
    if (!(await confirmBlock(authorId, authorName))) return;
    forgetPosts((p) => p.authorId === authorId);
    if (post?.authorId === authorId) router.back();
    else dropComments((c) => c.authorId === authorId);
  };

  const openPostMenu = () =>
    post &&
    setMenu([
      {
        label: 'Report post',
        icon: 'flag-outline',
        destructive: true,
        onPress: () => openReport({ kind: 'post', id: post.id }),
      },
      {
        label: `Block @${post.authorName}`,
        icon: 'ban-outline',
        destructive: true,
        onPress: () => block(post.authorId, post.authorName),
      },
    ]);

  const openCommentMenu = (comment: Comment) =>
    setMenu([
      {
        label: 'Report comment',
        icon: 'flag-outline',
        destructive: true,
        onPress: () => openReport({ kind: 'comment', id: comment.id }),
      },
      {
        label: `Block @${comment.authorName}`,
        icon: 'ban-outline',
        destructive: true,
        onPress: () => block(comment.authorId, comment.authorName),
      },
    ]);

  useEffect(() => {
    let cancelled = false;
    fetchComments(postId)
      .then((list) => !cancelled && setComments(list))
      .catch((error) => {
        console.warn('Failed to load comments', error);
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const comment = await addComment(postId, body);
      setComments((current) => [...(current ?? []), comment]);
      adjustCommentCount(postId, 1);
      setDraft('');
    } catch (error) {
      showError('Could not comment', error);
    } finally {
      setSending(false);
    }
  };

  const remove = async (commentId: string) => {
    if (!(await confirm('Delete comment?', 'This can’t be undone.', 'Delete'))) return;
    try {
      await deleteComment(commentId);
      setComments((current) => (current ?? []).filter((c) => c.id !== commentId));
      adjustCommentCount(postId, -1);
    } catch (error) {
      showError('Could not delete', error);
    }
  };

  const openCar = (carId: string | null) =>
    carId && router.push({ pathname: '/garage/[carId]', params: { carId } });

  const openProfile = (userId: string, name: string) =>
    router.push({ pathname: '/user/[userId]', params: { userId, name } });

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <FlatList
        data={comments ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          post ? (
            <View style={styles.captionBlock}>
              {post.videoUri ? (
                <PostVideo
                  uri={post.videoUri}
                  posterUri={post.imageUri}
                  active
                  controls
                  style={[styles.photo, styles.video]}
                />
              ) : (
                <Pressable
                  onPress={() => setViewerOpen(true)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={post.car ? `Photo of ${post.car}. View full screen` : 'View photo full screen'}>
                  {post.imageUris.length > 1 ? (
                    <MediaCarousel uris={post.imageUris} style={styles.photo} onIndexChange={setPhotoIndex} />
                  ) : (
                    <Image
                      source={{ uri: post.imageUri }}
                      style={styles.photo}
                      contentFit="cover"
                      transition={150}
                    />
                  )}
                </Pressable>
              )}
              {post.car || post.authorId !== user?.id ? (
              <View style={styles.carRow}>
                <Text
                  style={styles.car}
                  onPress={
                    post.carId
                      ? () => openCar(post.carId)
                      : undefined
                  }
                  accessibilityRole={post.carId ? 'link' : undefined}>
                  {post.car}
                  {post.carId ? ' ›' : ''}
                </Text>
                {post.authorId !== user?.id ? (
                  <Pressable
                    onPress={openPostMenu}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Post options">
                    <Ionicons name="ellipsis-horizontal" size={20} color={Colors.light.text} />
                  </Pressable>
                ) : null}
              </View>
              ) : null}
              <CommentRow
                name={post.authorName}
                userId={post.authorId}
                body={post.caption || 'shared a build'}
                createdAt={post.createdAt}
                onNamePress={() => openProfile(post.authorId, post.authorName)}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          comments === null ? (
            <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="car-sport-outline" size={36} color={Colors.light.tint} />
              <Text style={styles.emptyText}>No comments yet. Start the conversation.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <CommentRow
            name={item.authorName}
            userId={item.authorId}
            body={item.body}
            createdAt={item.createdAt}
            onNamePress={() => openProfile(item.authorId, item.authorName)}
            onDelete={item.authorId === user?.id ? () => remove(item.id) : undefined}
            onLongPress={item.authorId !== user?.id ? () => openCommentMenu(item) : undefined}
          />
        )}
      />
      <View style={[styles.composer, { paddingBottom: bottom + 10 }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`Comment as ${user?.username ?? 'you'}…`}
          placeholderTextColor={Colors.light.placeholder}
          maxLength={COMMENT_MAX_LENGTH}
          multiline
          accessibilityLabel="Write a comment"
          style={styles.input}
        />
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
          style={[styles.send, !canSend && styles.sendDisabled]}>
          {sending ? (
            <ActivityIndicator color={Colors.light.onTint} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={20} color={Colors.light.onTint} />
          )}
        </Pressable>
      </View>
      {post ? (
        <Modal
          visible={viewerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setViewerOpen(false)}>
          <Pressable
            style={styles.viewer}
            onPress={() => setViewerOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close photo">
            <Image
              source={{ uri: post.imageUris[photoIndex] ?? post.imageUri }}
              style={styles.viewerImage}
              contentFit="contain"
            />
            <View style={styles.viewerClose}>
              <Ionicons name="close" size={26} color="#ffffff" />
            </View>
          </Pressable>
        </Modal>
      ) : null}
      <OptionsSheet visible={menu !== null} options={menu ?? []} onClose={() => setMenu(null)} />
      {reportSheet}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  list: {
    padding: 16,
    gap: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
  },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerClose: {
    position: 'absolute',
    top: 48,
    right: 20,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 5,
    maxHeight: 520,
    borderRadius: 14,
    backgroundColor: Colors.light.imagePlaceholder,
    marginBottom: 12,
  },
  video: {
    overflow: 'hidden',
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  car: {
    flex: 1,
    color: Colors.light.tint,
    fontWeight: '800',
    fontSize: 16,
  },
  captionBlock: {
    gap: 0,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowBody: {
    flex: 1,
  },
  username: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  body: {
    color: Colors.light.text,
    lineHeight: 20,
  },
  meta: {
    color: Colors.light.muted,
    fontSize: 12,
    marginTop: 4,
  },
  loading: {
    marginTop: 32,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    marginTop: 48,
  },
  emptyText: {
    color: Colors.light.muted,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    color: Colors.light.text,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
