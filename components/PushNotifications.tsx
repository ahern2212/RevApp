import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { onPushOpened, registerForPush } from '@/lib/push';

/** Registers this device for push while signed in and routes taps to the post. Renders nothing. */
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
      onPushOpened((postId) =>
        router.push({ pathname: '/comments/[postId]', params: { postId } })
      ),
    [router]
  );

  return null;
}
