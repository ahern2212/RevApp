import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CarDetailsInput } from '@/components/CarDetailsInput';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import { PostVideo } from '@/components/PostVideo';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useGarage } from '@/context/GarageContext';
import { showError } from '@/lib/confirm';
import { useTabBarSpace } from '@/lib/layout';
import { type PickedMedia, pickPostMedia } from '@/lib/media';
import { formatDuration, VIDEO_MAX_SECONDS } from '@/lib/mediaRules';
import { type CarDetails, formatCar } from '@/lib/vehicles';

const EMPTY_CAR: CarDetails = { year: '', make: '', model: '' };
const CAPTION_MAX = 2200;

export default function PostScreen() {
  const { addPost } = useGarage();
  const router = useRouter();
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [car, setCar] = useState<CarDetails>(EMPTY_CAR);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const tabBarSpace = useTabBarSpace();
  const canShare = !!media && !busy && !preparing;
  const isVideo = media?.kind === 'video';

  const pick = async () => {
    setPreparing(true);
    try {
      const picked = await pickPostMedia();
      if (picked) setMedia(picked);
    } catch (error) {
      showError('Can’t post that', error);
    } finally {
      setPreparing(false);
    }
  };

  const share = async () => {
    if (!media) return;
    setBusy(true);
    try {
      await addPost({ media, caption, car: formatCar(car) });
      setMedia(null);
      setCar(EMPTY_CAR);
      setCaption('');
      router.replace('/');
    } catch (error) {
      showError('Could not share', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView
        style={styles.wrap}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Pressable
          onPress={pick}
          disabled={preparing || busy}
          style={styles.picker}
          accessibilityRole="button"
          accessibilityLabel={media ? 'Change photo or video' : 'Choose a car photo or video'}>
          {preparing ? (
            <View style={styles.pickerEmpty}>
              <ActivityIndicator color={Colors.light.tint} />
              <Text style={styles.pickerText}>Checking your file…</Text>
            </View>
          ) : media ? (
            <>
              {media.kind === 'video' && media.posterUri ? (
                <PostVideo uri={media.uri} posterUri={media.posterUri} active style={styles.preview} />
              ) : (
                <Image source={{ uri: media.uri }} style={styles.preview} contentFit="cover" />
              )}
              {media.kind === 'video' && media.durationMs ? (
                <View style={[styles.badge, styles.durationBadge]}>
                  <Ionicons name="videocam" size={14} color={Colors.light.onTint} />
                  <Text style={styles.badgeText}>{formatDuration(media.durationMs)}</Text>
                </View>
              ) : null}
              <View style={[styles.badge, styles.changeBadge]}>
                <Ionicons name="images-outline" size={14} color={Colors.light.onTint} />
                <Text style={styles.badgeText}>Change</Text>
              </View>
            </>
          ) : (
            <View style={styles.pickerEmpty}>
              <View style={styles.pickerIcons}>
                <Ionicons name="camera-outline" size={40} color={Colors.light.tint} />
                <Ionicons name="videocam-outline" size={40} color={Colors.light.tint} />
              </View>
              <Text style={styles.pickerText}>Tap to choose a car photo or video</Text>
              <Text style={styles.rules}>
                JPEG, PNG, WebP or HEIC photos · MP4 or MOV videos up to {VIDEO_MAX_SECONDS} seconds
              </Text>
            </View>
          )}
        </Pressable>
        <CarDetailsInput value={car} onChange={setCar} />
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Caption"
          maxLength={CAPTION_MAX}
          placeholderTextColor={Colors.light.placeholder}
          multiline
          style={[styles.input, styles.caption]}
        />
        {caption.length > CAPTION_MAX - 200 ? (
          <Text style={styles.counter}>
            {caption.length}/{CAPTION_MAX}
          </Text>
        ) : null}
        <Pressable
          style={[styles.button, !canShare && styles.buttonDisabled]}
          disabled={!canShare}
          onPress={share}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canShare, busy }}>
          <Text style={styles.buttonText}>
            {busy ? (isVideo ? 'Uploading video…' : 'Sharing…') : 'Share'}
          </Text>
        </Pressable>
        {!media ? (
          <Text style={styles.hint}>
            Photos are cleaned before upload: location and camera details are removed.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  wrap: {
    flex: 1,
  },
  content: {
    padding: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  picker: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  pickerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(45, 31, 71, 0.7)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeBadge: {
    right: 12,
  },
  durationBadge: {
    left: 12,
  },
  badgeText: {
    color: Colors.light.onTint,
    fontWeight: '700',
    fontSize: 12,
  },
  counter: {
    color: Colors.light.muted,
    fontSize: 12,
    textAlign: 'right',
    marginTop: -6,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  hint: {
    color: Colors.light.muted,
    textAlign: 'center',
    fontSize: 13,
  },
  pickerText: {
    color: Colors.light.muted,
    fontSize: 16,
    textAlign: 'center',
  },
  rules: {
    color: Colors.light.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  input: {
    ...glass,
    shadowOpacity: 0,
    color: Colors.light.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  caption: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: Colors.light.onTint,
    fontWeight: '800',
    fontSize: 16,
  },
});
