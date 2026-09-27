import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { NotificationToaster } from '@/components/NotificationToaster';
import { PushNotifications } from '@/components/PushNotifications';
import { SetupScreen } from '@/components/SetupScreen';
import Colors from '@/constants/Colors';
import { ActivityProvider } from '@/context/ActivityContext';
import { AuthProvider } from '@/context/AuthContext';
import { ProfilesProvider } from '@/context/ProfilesContext';
import { GarageProvider, useGarage } from '@/context/GarageContext';

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
          <Stack.Screen
            name="edit-post/[postId]"
            options={{ presentation: 'modal', title: 'Edit caption' }}
          />
          <Stack.Screen name="user/[userId]" options={{ title: 'Garage' }} />
        </Stack>
        <NotificationToaster />
        <PushNotifications />
      </ActivityProvider>
    </ThemeProvider>
  );
}
