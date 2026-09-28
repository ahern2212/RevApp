import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { NotificationToaster } from '@/components/NotificationToaster';
import { PushNotifications } from '@/components/PushNotifications';
import { SetupScreen } from '@/components/SetupScreen';
import Colors, { activeTheme } from '@/constants/Colors';
import { ActivityProvider } from '@/context/ActivityContext';
import { AuthProvider } from '@/context/AuthContext';
import { ProfilesProvider } from '@/context/ProfilesContext';
import { GarageProvider, useGarage } from '@/context/GarageContext';
import { MessagesProvider } from '@/context/MessagesContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style={activeTheme.dark ? 'light' : 'dark'} />
      <GarageProvider>
        <ProfilesProvider>
          <RootLayoutNav />
        </ProfilesProvider>
      </GarageProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { ready, user } = useGarage();

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: Colors.light.background }} />;
  }

  if (!user) {
    return <SetupScreen />;
  }

  return (
    <ThemeProvider value={navTheme}>
      <ActivityProvider>
        <MessagesProvider>
        <Stack screenOptions={{ headerTitleStyle: { fontWeight: '800' }, headerBackTitle: 'Back' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="comments/[postId]"
            options={{ presentation: 'modal', title: 'Post' }}
          />
          <Stack.Screen name="activity" options={{ title: 'Activity' }} />
          <Stack.Screen name="search" options={{ title: 'Search' }} />
          <Stack.Screen name="likes/[postId]" options={{ title: 'Likes' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal', title: 'Edit profile' }} />
          <Stack.Screen name="events/new" options={{ presentation: 'modal', title: 'Host a meet' }} />
          <Stack.Screen name="events/[eventId]" options={{ title: 'Meet' }} />
          <Stack.Screen name="forums/new" options={{ presentation: 'modal', title: 'New thread' }} />
          <Stack.Screen name="forums/[threadId]" options={{ title: 'Thread' }} />
          <Stack.Screen name="garage/edit" options={{ presentation: 'modal', title: 'Garage' }} />
          <Stack.Screen name="garage/[carId]" options={{ title: 'Car' }} />
          <Stack.Screen name="themes" options={{ title: 'App colors' }} />
          <Stack.Screen name="market/new" options={{ presentation: 'modal', title: 'Sell something' }} />
          <Stack.Screen name="market/[listingId]" options={{ title: 'Listing' }} />
          <Stack.Screen
            name="edit-post/[postId]"
            options={{ presentation: 'modal', title: 'Edit caption' }}
          />
          <Stack.Screen name="user/[userId]" options={{ title: 'Profile' }} />
          <Stack.Screen name="follows/[userId]" options={{ title: 'Drivers' }} />
          <Stack.Screen name="blocked" options={{ title: 'Blocked accounts' }} />
          <Stack.Screen name="notification-settings" options={{ title: 'Notifications' }} />
          <Stack.Screen name="inbox" options={{ title: 'Messages' }} />
          <Stack.Screen name="messages/[conversationId]" options={{ title: 'Chat' }} />
          <Stack.Screen name="send-post/[postId]" options={{ presentation: 'modal', title: 'Send to' }} />
          <Stack.Screen
            name="story/[authorId]"
            options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }}
          />
        </Stack>
        <NotificationToaster />
        <PushNotifications />
        </MessagesProvider>
      </ActivityProvider>
    </ThemeProvider>
  );
}
