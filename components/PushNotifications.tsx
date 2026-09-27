import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { onPushOpened, registerForPush } from '@/lib/push';

/** Registers this device for push while signed in and routes taps to the post or profile. Renders nothing. */
export function PushNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    registerForPush().catch((error) => console.warn('Push registration failed', error));
  }, [userId]);

  useEffect(
    () =>
      onPushOpened((target) =>
        'postId' in target
          ? router.push({ pathname: '/comments/[postId]', params: { postId: target.postId } })
          : router.push({
              pathname: '/user/[userId]',
              params: { userId: target.userId, ...(target.username ? { name: target.username } : {}) },
            })
      ),
    [router]
  );

  return null;
}
