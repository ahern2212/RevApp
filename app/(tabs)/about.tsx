import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useTabBarSpace } from '@/lib/layout';

type IconName = keyof typeof Ionicons.glyphMap;

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'images-outline', title: 'Share builds', text: 'Post up to 10 photos or a video; like and comment with the car button.' },
  { icon: 'people-outline', title: 'Follow drivers', text: 'Follow people and switch the feed to just their builds.' },
  { icon: 'paper-plane-outline', title: 'Messages', text: 'Chat with drivers and sellers, and send them posts.' },
  { icon: 'car-sport-outline', title: 'Your garage', text: 'Every car gets a page with its mods and a build log of tagged posts.' },
  { icon: 'compass-outline', title: 'Explore', text: 'Trending #tags, top posts and drivers to follow.' },
  { icon: 'map-outline', title: 'Meets', text: 'Find car meets on the map and see who’s rolling in.' },
  { icon: 'chatbubbles-outline', title: 'Forums', text: 'Ask for help, share builds, talk shop.' },
  { icon: 'storefront-outline', title: 'Market', text: 'Buy and sell cars, parts and wheels locally.' },
  { icon: 'shield-checkmark-outline', title: 'Safe by design', text: 'Real photos only, no location data, and report or block in two taps.' },
  { icon: 'color-palette-outline', title: 'Your look', text: 'Vote on the app’s colors and switch themes.' },
];

const GUIDELINES: { icon: IconName; text: string }[] = [
  { icon: 'car-sport-outline', text: 'Keep it about cars: your builds, parts, meets and car culture.' },
  { icon: 'heart-outline', text: 'Respect every build — stock or stanced, budget or big money.' },
  { icon: 'speedometer-outline', text: 'Drive safe. No street racing or reckless driving content.' },
  { icon: 'pricetag-outline', text: 'List honestly: real photos, real condition, real prices.' },
  { icon: 'lock-closed-outline', text: 'Protect privacy — no plates or personal info without consent.' },
  { icon: 'flag-outline', text: 'See something that breaks these rules? Tap “…” and report it, or block the account.' },
];

export default function AboutScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.content, { paddingTop: top + 16, paddingBottom: tabBarSpace }]}>
        <View style={[styles.card, styles.hero]}>
          <Text style={styles.brand}>RevApp</Text>
          <Text style={styles.heroTitle}>For the car community</Text>
          <Text style={styles.heroText}>
            A home for your builds, your crew and your next meet.
          </Text>
          <View style={styles.heroCar}>
            <Ionicons name="car-sport" size={72} color={Colors.light.tint} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Our story</Text>
          <Text style={styles.paragraph}>
            RevApp started as a simple idea: car culture lives in parking lots, garages and group chats, but
            there wasn’t one place built just for it. So we made one — a feed for your builds, a garage for
            your cars, a map for meets, forums for help, and a market for the parts you need next.
          </Text>
        </View>

        <Text style={styles.heading}>What you can do here</Text>
        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={[styles.card, styles.feature]}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={20} color={Colors.light.onTint} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Community guidelines</Text>
          {GUIDELINES.map((rule) => (
            <View key={rule.text} style={styles.rule}>
              <Ionicons name={rule.icon} size={18} color={Colors.light.tint} />
              <Text style={styles.ruleText}>{rule.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Get in touch</Text>
          <Text style={styles.paragraph}>Ideas, bugs or feature requests? We read everything.</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push('/forums/new')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Ionicons name="create-outline" size={16} color={Colors.light.onTint} />
              <Text style={styles.primaryText}>Share feedback</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/themes')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Ionicons name="color-palette-outline" size={16} color={Colors.light.tint} />
              <Text style={styles.secondaryText}>Vote on colors</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footer}>RevApp {version} · Made with ♥ for car people</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    ...glass,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  hero: {
    gap: 6,
  },
  brand: {
    color: Colors.light.tint,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 4,
  },
  heroTitle: {
    color: Colors.light.text,
    fontSize: 26,
    fontWeight: '900',
  },
  heroText: {
    color: Colors.light.muted,
    lineHeight: 21,
  },
  heroCar: {
    marginTop: 6,
    alignItems: 'center',
  },
  sectionTitle: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: '900',
  },
  heading: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  paragraph: {
    color: Colors.light.text,
    lineHeight: 21,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  feature: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 6,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    color: Colors.light.text,
    fontWeight: '800',
  },
  featureText: {
    color: Colors.light.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 2,
  },
  ruleText: {
    flex: 1,
    color: Colors.light.text,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.tint,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryText: {
    color: Colors.light.onTint,
    fontWeight: '800',
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryText: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
  footer: {
    color: Colors.light.muted,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
  },
});
