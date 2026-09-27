import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { CATEGORY_ICONS, formatPrice, type Listing } from '@/lib/listings';
import { timeAgo } from '@/lib/time';

/** Marketplace grid tile: photo with a price badge, title, and where/when. */
export function ListingCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price)}${listing.sold ? ', sold' : ''}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View>
        <Image source={{ uri: listing.photoUri }} style={styles.photo} contentFit="cover" transition={150} />
        <View style={styles.price}>
          <Text style={styles.priceText}>{formatPrice(listing.price)}</Text>
        </View>
        {listing.sold ? (
          <View style={styles.soldOverlay}>
            <Text style={styles.soldText}>SOLD</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name={CATEGORY_ICONS[listing.category]} size={12} color={Colors.light.muted} />
          <Text style={styles.meta} numberOfLines={1}>
            {listing.location || listing.category} · {timeAgo(listing.createdAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...glass,
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  price: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(20, 16, 30, 0.72)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  priceText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  soldOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20, 16, 30, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: 4,
  },
  body: {
    padding: 10,
    gap: 4,
  },
  title: {
    color: Colors.light.text,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    flex: 1,
    color: Colors.light.muted,
    fontSize: 12,
  },
});
