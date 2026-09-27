import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { SetupScreen } from '@/components/SetupScreen';
import Colors from '@/constants/Colors';
import { AuthProvider } from '@/context/AuthContext';
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
        <RootLayoutNav />
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
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="comments/[postId]"
          options={{ presentation: 'modal', title: 'Comments', headerTitleStyle: { fontWeight: '800' } }}
        />
      </Stack>
    </ThemeProvider>
  );
}
