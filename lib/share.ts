import { Platform, Share } from 'react-native';

import type { Post } from '@/types';

// Public website (e.g. https://garage.expo.app) so links shared from phones open the post
// in a browser. Optional: without it, phones share the photo link instead.
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/+$/, '');

/** Link to the post's page on the website, falling back to the photo itself. */
export function postLink(post: Post): string {
  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : WEB_URL;
  return origin ? `${origin}/comments/${post.id}` : post.imageUri;
}

/** Opens the system share sheet (or the browser's share / copy fallback) for a post. */
export async function sharePost(post: Post): Promise<void> {
  const title = post.car ? `${post.authorName}'s ${post.car}` : `${post.authorName}'s build`;
  const text = [`${title} on RevApp`, post.caption].filter(Boolean).join('\n');
  const url = postLink(post);

  if (Platform.OS === 'web') {
    // Browsers without navigator.share (most desktops) get the link copied instead.
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text, url }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      window.alert('Link copied to clipboard');
    }
    return;
  }

  await Share.share(
    Platform.OS === 'ios' ? { message: text, url } : { message: `${text}\n${url}`, title }
  );
}
