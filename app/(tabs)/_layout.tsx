import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { GarageTabBar } from '@/components/GarageTabBar';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import Colors from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GarageTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: Colors.light.background },
        headerTintColor: Colors.light.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          // The feed draws its own header so it can slide away on scroll.
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          headerShown: false, // the screen has its own title row with "Host a meet"
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'calendar', android: 'event', web: 'event' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'plus.square', android: 'add_box', web: 'add_box' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="forums"
        options={{
          title: 'Forums',
          headerShown: false, // the screen has its own title row with "New thread"
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'storefront', android: 'storefront', web: 'storefront' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.crop.circle', android: 'person', web: 'person' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
    </Tabs>
  );
}