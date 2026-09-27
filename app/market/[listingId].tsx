import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useReportSheet } from '@/components/SafetyActions';
import { useGarage } from '@/context/GarageContext';
import { confirm, showError } from '@/lib/confirm';
import { CATEGORY_ICONS, deleteListing, fetchListing, formatPrice, type Listing, setListingSold } from '@/lib/listings';
import { startConversation } from '@/lib/messages';
import { timeAgo } from '@/lib/time';

export default function ListingScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const { user } = useGarage();
  const [loaded, setLoaded] = useState<{ id: string; listing: Listing | null } | null>(null);
  const [viewer, setViewer] = useState(false);
  const [busy, setBusy] = useState(false);
  const listing = loaded?.id === listingId ? loaded.listing : undefined;
  const { openReport, reportSheet } = useReportSheet(() => router.back());

  useEffect(() => {
    let cancelled = false;
    fetchListing(listingId)
      .then((next) => !cancelled && setLoaded({ id: listingId, listing: next }))
      .catch((error) => {
        console.warn('Failed to load listing', error);
        if (!cancelled) setLoaded({ id: listingId, listing: null });
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  if (listing === undefined) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
      </View>
    );
  }
  if (listing === null) {
    return (
      <View style={styles.screen}>
        <Text style={styles.missing}>This listing was removed or couldn’t be loaded.</Text>
      </View>
    );
  }

  const mine = listing.sellerId === user?.id;

  const toggleSold = async () => {
    setBusy(true);
    try {
      await setListingSold(listing.id, !listing.sold);
      setLoaded({ id: listing.id, listing: { ...listing, sold: !listing.sold } });
    } catch (error) {
      showError('Could not update listing', error);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!(await confirm('Delete this listing?', 'It will be removed from the market.', 'Delete'))) return;
    setBusy(true);
    try {
      await deleteListing(listing);
      router.back();
    } catch (error) {
      showError('Could not delete', error);
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <Stack.Screen options={{ title: listing.category }} />
      <ScrollView style={styles.list} contentContainerStyle={styles.content}>
        <Pressable onPress={() => setViewer(true)} accessibilityRole="imagebutton" accessibilityLabel="View photo full screen">
          <Image source={{ uri: listing.photoUri }} style={styles.photo} contentFit="cover" transition={150} />
          {listing.sold ? (
            <View style={styles.soldBanner}>
              <Text style={styles.soldText}>SOLD</Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.tags}>
            <View style={styles.tag}>
              <Ionicons name={CATEGORY_ICONS[listing.category]} size={13} color={Colors.light.tint} />
              <Text style={styles.tagText}>{listing.category}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{listing.condition}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={Colors.light.muted} />
            <Text style={styles.meta}>
              {listing.location || 'Location not given'} · listed {timeAgo(listing.createdAt)} ago
            </Text>
          </View>
          {listing.description ? <Text style={styles.description}>{listing.description}</Text> : null}
        </View>

        {!mine ? (
          <Pressable
            onPress={async () => {
              try {
                const conversationId = await startConversation(listing.sellerId);
                router.push({
                  pathname: '/messages/[conversationId]',
                  params: {
                    conversationId,
                    name: listing.sellerName,
                    draft: listing.sold ? '' : `Hi! Is your “${listing.title}” still available?`,
                  },
                });
              } catch (error) {
                showError('Could not open chat', error);
              }
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Ionicons name="paper-plane" size={18} color={Colors.light.onTint} />
            <Text style={styles.primaryText}>Message seller</Text>
          </Pressable>
        ) : null}

        {listing.contact ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>How to reach the seller</Text>
            <View style={styles.contactRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.light.tint} />
              <Text style={styles.contact} selectable>
                {listing.contact}
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() =>
            router.push({ pathname: '/user/[userId]', params: { userId: listing.sellerId, name: listing.sellerName } })
          }
          accessibilityRole="link"
          style={({ pressed }) => [styles.card, styles.seller, pressed && styles.pressed]}>
          <Avatar name={listing.sellerName} userId={listing.sellerId} size={44} />
          <View style={styles.sellerText}>
            <Text style={styles.sellerLabel}>Seller</Text>
            <Text style={styles.sellerName}>@{listing.sellerName}</Text>
          </View>
          <Text style={styles.sellerLink}>See garage</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.light.muted} />
        </Pressable>

        {!mine ? (
          <Pressable
            onPress={() => openReport({ kind: 'listing', id: listing.id })}
            accessibilityRole="button"
            style={styles.reportRow}>
            <Ionicons name="flag-outline" size={15} color={Colors.light.muted} />
            <Text style={styles.reportText}>Report listing</Text>
          </Pressable>
        ) : null}

        {mine ? (
          <View style={styles.ownerActions}>
            <Pressable
              onPress={toggleSold}
              disabled={busy}
              accessibilityRole="button"
              style={[styles.primary, busy && styles.disabled]}>
              <Ionicons
                name={listing.sold ? 'refresh' : 'checkmark-done'}
                size={18}
                color={Colors.light.onTint}
              />
              <Text style={styles.primaryText}>{listing.sold ? 'Relist' : 'Mark as sold'}</Text>
            </Pressable>
            <Pressable onPress={remove} disabled={busy} accessibilityRole="button" style={styles.delete}>
              <Ionicons name="trash-outline" size={16} color={Colors.light.danger} />
              <Text style={styles.deleteText}>Delete listing</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={viewer} transparent animationType="fade" onRequestClose={() => setViewer(false)}>
        <Pressable style={styles.viewer} onPress={() => setViewer(false)} accessibilityRole="button" accessibilityLabel="Close photo">
          <Image source={{ uri: listing.photoUri }} style={styles.viewerImage} contentFit="contain" />
        </Pressable>
      </Modal>
      {reportSheet}
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
  loading: {
    marginTop: 48,
  },
  missing: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 520,
    borderRadius: 20,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  soldBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(20, 16, 30, 0.8)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  soldText: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 3,
  },
  card: {
    ...glass,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  price: {
    color: Colors.light.tint,
    fontSize: 28,
    fontWeight: '900',
  },
  title: {
    color: Colors.light.text,
    fontSize: 20,
    fontWeight: '800',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.background,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: Colors.light.text,
    fontWeight: '700',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    flex: 1,
    color: Colors.light.muted,
    fontSize: 13,
  },
  description: {
    color: Colors.light.text,
    lineHeight: 21,
    marginTop: 4,
  },
  sectionTitle: {
    color: Colors.light.text,
    fontWeight: '800',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  contact: {
    flex: 1,
    color: Colors.light.text,
    lineHeight: 20,
  },
  seller: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerText: {
    flex: 1,
  },
  sellerLabel: {
    color: Colors.light.muted,
    fontSize: 12,
  },
  sellerName: {
    color: Colors.light.text,
    fontWeight: '800',
  },
  sellerLink: {
    color: Colors.light.tint,
    fontWeight: '700',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  reportText: {
    color: Colors.light.muted,
    fontWeight: '600',
  },
  ownerActions: {
    gap: 4,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryText: {
    color: Colors.light.onTint,
    fontWeight: '800',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.4,
  },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  deleteText: {
    color: Colors.light.danger,
    fontWeight: '700',
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
});
