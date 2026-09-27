import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useGarage } from '@/context/GarageContext';
import { showError } from '@/lib/confirm';
import {
  CATEGORY_ICONS,
  CONDITIONS,
  type Condition,
  CONTACT_MAX,
  createListing,
  DESCRIPTION_MAX,
  formatPrice,
  LISTING_CATEGORIES,
  type ListingCategory,
  LOCATION_MAX,
  parsePrice,
  TITLE_MAX,
} from '@/lib/listings';

type Photo = { uri: string; mimeType?: string };

export default function NewListingScreen() {
  const router = useRouter();
  const { user } = useGarage();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [title, setTitle] = useState('');
  const [priceText, setPriceText] = useState('');
  const [category, setCategory] = useState<ListingCategory>('Parts');
  const [condition, setCondition] = useState<Condition>('Used');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState(user ? `DM @${user.username} on RevApp` : '');
  const [busy, setBusy] = useState(false);

  const price = parsePrice(priceText);
  const problem = !photo
    ? 'Add a photo.'
    : title.trim().length < 3
      ? 'Add a title (3+ characters).'
      : price === null
        ? 'Enter a price in whole dollars (0 for free).'
        : null;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
  };

  const post = async () => {
    if (!user || !photo || price === null || problem) return;
    setBusy(true);
    try {
      const listing = await createListing(user.id, {
        title,
        price,
        category,
        condition,
        location,
        description,
        contact,
        photo,
      });
      router.replace({ pathname: '/market/[listingId]', params: { listingId: listing.id } });
    } catch (error) {
      showError('Could not post listing', error);
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Pressable
          onPress={pickPhoto}
          accessibilityRole="button"
          accessibilityLabel={photo ? 'Change photo' : 'Add a photo'}
          style={styles.photoPicker}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoEmpty}>
              <Ionicons name="camera-outline" size={36} color={Colors.light.tint} />
              <Text style={styles.photoText}>Add a photo</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.label}>What are you selling?</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Tein Flex Z coilovers — Civic FK8"
          placeholderTextColor={Colors.light.placeholder}
          maxLength={TITLE_MAX}
          accessibilityLabel="Title"
          style={styles.input}
        />

        <Text style={styles.label}>Price</Text>
        <View style={styles.priceRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            value={priceText}
            onChangeText={(text) => setPriceText(text.replace(/[^\d,]/g, ''))}
            placeholder="0"
            placeholderTextColor={Colors.light.placeholder}
            keyboardType="number-pad"
            accessibilityLabel="Price in dollars"
            style={styles.priceInput}
          />
          {price !== null && priceText ? <Text style={styles.pricePreview}>{formatPrice(price)}</Text> : null}
        </View>

        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {LISTING_CATEGORIES.map((c) => (
            <Chip key={c} label={c} icon={CATEGORY_ICONS[c]} active={c === category} onPress={() => setCategory(c)} />
          ))}
        </View>

        <Text style={styles.label}>Condition</Text>
        <View style={styles.chips}>
          {CONDITIONS.map((c) => (
            <Chip key={c} label={c} active={c === condition} onPress={() => setCondition(c)} />
          ))}
        </View>

        <Text style={styles.label}>Location</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="City, e.g. Sacramento, CA"
          placeholderTextColor={Colors.light.placeholder}
          maxLength={LOCATION_MAX}
          accessibilityLabel="Location"
          style={styles.input}
        />

        <Text style={styles.label}>Details</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Mileage, fitment, what's included, any damage…"
          placeholderTextColor={Colors.light.placeholder}
          maxLength={DESCRIPTION_MAX}
          multiline
          accessibilityLabel="Details"
          style={[styles.input, styles.multiline]}
        />

        <Text style={styles.label}>How buyers reach you</Text>
        <TextInput
          value={contact}
          onChangeText={setContact}
          placeholder="e.g. DM me on RevApp, or text 555-0100"
          placeholderTextColor={Colors.light.placeholder}
          maxLength={CONTACT_MAX}
          accessibilityLabel="Contact"
          style={styles.input}
        />
        <Text style={styles.hint}>This is shown publicly on your listing — only share what you’re comfortable with.</Text>

        {problem ? <Text style={styles.problem}>{problem}</Text> : null}
        <Pressable
          onPress={post}
          disabled={!!problem || busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!problem || busy, busy }}
          style={[styles.button, (!!problem || busy) && styles.disabled]}>
          <Text style={styles.buttonText}>{busy ? 'Posting…' : 'Post listing'}</Text>
        </Pressable>
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
    padding: 16,
    paddingBottom: 48,
    gap: 10,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  photoPicker: {
    ...glass,
    borderRadius: 18,
    overflow: 'hidden',
    aspectRatio: 1,
    maxHeight: 360,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoText: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  label: {
    color: Colors.light.text,
    fontWeight: '800',
    marginTop: 8,
  },
  input: {
    ...glass,
    shadowOpacity: 0,
    color: Colors.light.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  priceRow: {
    ...glass,
    shadowOpacity: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  dollar: {
    color: Colors.light.muted,
    fontSize: 20,
    fontWeight: '800',
  },
  priceInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 20,
    fontWeight: '800',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  pricePreview: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hint: {
    color: Colors.light.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  problem: {
    color: Colors.light.muted,
    textAlign: 'center',
    fontSize: 13,
    marginTop: 4,
  },
  button: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: Colors.light.onTint,
    fontWeight: '800',
    fontSize: 16,
  },
});
