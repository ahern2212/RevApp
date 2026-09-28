import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CarDetailsInput } from '@/components/CarDetailsInput';
import { Chip } from '@/components/Chip';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import { MediaCarousel } from '@/components/MediaCarousel';
import { MediaGrid } from '@/components/MediaGrid';
import { MentionSuggestions, useMentions } from '@/components/MentionSuggestions';
import { PostVideo } from '@/components/PostVideo';
import { PressableScale } from '@/components/PressableScale';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useGarage } from '@/context/GarageContext';
import { type Car, carTitle, fetchCars } from '@/lib/cars';
import { showError } from '@/lib/confirm';
import { type CarEvent, fetchTaggableEvents } from '@/lib/events';
import { GRID_MAX, GRID_MIN } from '@/lib/gridLayout';
import { useTabBarSpace } from '@/lib/layout';
import { type PickedMedia, pickPostMedia } from '@/lib/media';
import { CAROUSEL_MAX, formatDuration, VIDEO_MAX_SECONDS } from '@/lib/mediaRules';
import { checkPoll, cleanPoll, POLL_MAX_OPTIONS, POLL_OPTION_MAX, POLL_QUESTION_MAX } from '@/lib/pollRules';
import { type CarDetails, formatCar } from '@/lib/vehicles';

const EMPTY_CAR: CarDetails = { year: '', make: '', model: '' };
const CAPTION_MAX = 2200;

export default function PostScreen() {
  const { addPost, user } = useGarage();
  const userId = user?.id;
  const [myCars, setMyCars] = useState<Car[]>([]);
  const [carId, setCarId] = useState<string | null>(null);
  const [meets, setMeets] = useState<CarEvent[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const router = useRouter();
  // One video, or 1–10 photos.
  const [media, setMedia] = useState<PickedMedia[] | null>(null);
  const first = media?.[0];
  const [preparing, setPreparing] = useState(false);
  const [car, setCar] = useState<CarDetails>(EMPTY_CAR);
  const [caption, setCaption] = useState('');
  const mentions = useMentions(caption, setCaption);
  const [busy, setBusy] = useState(false);
  const [layout, setLayout] = useState<'carousel' | 'grid'>('carousel');
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const tabBarSpace = useTabBarSpace();
  // 2–6 photos (no video) can be shown as a grid instead of a carousel.
  const photoCount = media && media.every((item) => item.kind === 'image') ? media.length : 0;
  const canGrid = photoCount >= GRID_MIN && photoCount <= GRID_MAX;
  const shownLayout = canGrid ? layout : 'carousel';
  const canShare = !!media && !busy && !preparing;

  // Your garage, reloaded each visit so a car added a moment ago can be tagged.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      fetchCars(userId)
        .then((cars) => !cancelled && setMyCars(cars))
        .catch((error) => console.warn('Failed to load your garage', error));
      fetchTaggableEvents(userId)
        .then((events) => !cancelled && setMeets(events))
        .catch((error) => console.warn('Failed to load your meets', error));
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const tagCar = (tagged: Car) => {
    if (carId === tagged.id) {
      setCarId(null);
      return;
    }
    setCarId(tagged.id);
    setCar({ year: tagged.year, make: tagged.make, model: tagged.model });
  };
  const isVideo = first?.kind === 'video';

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
    const pollDraft = { question: pollQuestion, options: pollOptions };
    if (pollOpen) {
      const problem = checkPoll(pollDraft);
      if (problem) {
        showError('Check your poll', new Error(problem));
        return;
      }
    }
    setBusy(true);
    try {
      await addPost({
        media,
        caption,
        car: formatCar(car),
        carId,
        eventId,
        layout: shownLayout,
        poll: pollOpen ? cleanPoll(pollDraft) : null,
      });
      setMedia(null);
      setCar(EMPTY_CAR);
      setCarId(null);
      setEventId(null);
      setCaption('');
      setLayout('carousel');
      setPollOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
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
          accessibilityLabel={media ? 'Change photos or video' : 'Choose car photos or a video'}>
          {preparing ? (
            <View style={styles.pickerEmpty}>
              <ActivityIndicator color={Colors.light.tint} />
              <Text style={styles.pickerText}>Checking your file…</Text>
            </View>
          ) : media && first ? (
            <>
              {first.kind === 'video' && first.posterUri ? (
                <PostVideo uri={first.uri} posterUri={first.posterUri} active style={styles.preview} />
              ) : media.length > 1 && shownLayout === 'grid' ? (
                <MediaGrid uris={media.map((item) => item.uri)} style={styles.preview} />
              ) : media.length > 1 ? (
                <MediaCarousel uris={media.map((item) => item.uri)} style={styles.preview} />
              ) : (
                <Image source={{ uri: first.uri }} style={styles.preview} contentFit="cover" />
              )}
              {first.kind === 'video' && first.durationMs ? (
                <View style={[styles.badge, styles.durationBadge]}>
                  <Ionicons name="videocam" size={14} color={Colors.light.onTint} />
                  <Text style={styles.badgeText}>{formatDuration(first.durationMs)}</Text>
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
              <Text style={styles.pickerText}>Tap to choose car photos or a video</Text>
              <Text style={styles.rules}>
                Cars, parts, meets and builds only. Up to {CAROUSEL_MAX} JPEG, PNG, WebP or HEIC photos,
                or one MP4 or MOV video up to {VIDEO_MAX_SECONDS} seconds.
              </Text>
            </View>
          )}
        </Pressable>
        {canGrid ? (
          <View style={styles.tagChips} accessibilityRole="radiogroup">
            <Chip
              label="Carousel"
              icon="copy-outline"
              active={shownLayout === 'carousel'}
              onPress={() => setLayout('carousel')}
            />
            <Chip label="Grid" icon="grid-outline" active={shownLayout === 'grid'} onPress={() => setLayout('grid')} />
          </View>
        ) : null}
        {myCars.length > 0 ? (
          <View style={styles.tagBlock}>
            <Text style={styles.tagLabel}>Tag a car from your garage</Text>
            <View style={styles.tagChips}>
              {myCars.map((mine) => (
                <Chip
                  key={mine.id}
                  label={mine.nickname || carTitle(mine)}
                  icon="car-sport-outline"
                  active={carId === mine.id}
                  onPress={() => tagCar(mine)}
                />
              ))}
            </View>
          </View>
        ) : null}
        {meets.length > 0 ? (
          <View style={styles.tagBlock}>
            <Text style={styles.tagLabel}>At a meet?</Text>
            <View style={styles.tagChips}>
              {meets.map((meet) => (
                <Chip
                  key={meet.id}
                  label={meet.title}
                  icon="location-outline"
                  active={eventId === meet.id}
                  onPress={() => setEventId(eventId === meet.id ? null : meet.id)}
                />
              ))}
            </View>
          </View>
        ) : null}
        <CarDetailsInput
          value={car}
          onChange={(details) => {
            setCar(details);
            setCarId(null); // typed a different car: drop the garage tag
          }}
        />
        <TextInput
          value={caption}
          onChangeText={setCaption}
          onSelectionChange={mentions.onSelectionChange}
          placeholder="Caption (use #tags and @mentions)"
          maxLength={CAPTION_MAX}
          placeholderTextColor={Colors.light.placeholder}
          multiline
          style={[styles.input, styles.caption]}
        />
        <MentionSuggestions suggestions={mentions.suggestions} onPick={mentions.pick} />
        {pollOpen ? (
          <View style={styles.pollBox}>
            <View style={styles.pollHeader}>
              <Ionicons name="stats-chart" size={16} color={Colors.light.tint} />
              <Text style={styles.tagLabel}>Poll</Text>
              <Text
                style={styles.pollRemove}
                onPress={() => setPollOpen(false)}
                accessibilityRole="button">
                Remove
              </Text>
            </View>
            <TextInput
              value={pollQuestion}
              onChangeText={setPollQuestion}
              placeholder="Ask something, e.g. Which wheels?"
              placeholderTextColor={Colors.light.placeholder}
              maxLength={POLL_QUESTION_MAX}
              accessibilityLabel="Poll question"
              style={styles.input}
            />
            {pollOptions.map((option, index) => (
              <View key={index} style={styles.pollOptionRow}>
                <TextInput
                  value={option}
                  onChangeText={(text) =>
                    setPollOptions((current) => current.map((value, i) => (i === index ? text : value)))
                  }
                  placeholder={`Answer ${index + 1}`}
                  placeholderTextColor={Colors.light.placeholder}
                  maxLength={POLL_OPTION_MAX}
                  accessibilityLabel={`Poll answer ${index + 1}`}
                  style={[styles.input, styles.pollOptionInput]}
                />
                {index >= 2 ? (
                  <Ionicons
                    name="close-circle"
                    size={22}
                    color={Colors.light.muted}
                    onPress={() => setPollOptions((current) => current.filter((_, i) => i !== index))}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove answer ${index + 1}`}
                  />
                ) : null}
              </View>
            ))}
            {pollOptions.length < POLL_MAX_OPTIONS ? (
              <Text
                style={styles.pollAdd}
                onPress={() => setPollOptions((current) => [...current, ''])}
                accessibilityRole="button">
                + Add answer
              </Text>
            ) : null}
          </View>
        ) : (
          <Chip label="Add a poll" icon="stats-chart-outline" onPress={() => setPollOpen(true)} />
        )}
        {caption.length > CAPTION_MAX - 200 ? (
          <Text style={styles.counter}>
            {caption.length}/{CAPTION_MAX}
          </Text>
        ) : null}
        <PressableScale
          style={[styles.button, !canShare && styles.buttonDisabled]}
          disabled={!canShare}
          onPress={share}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canShare, busy }}>
          <Text style={styles.buttonText}>
            {busy ? (isVideo ? 'Uploading video…' : 'Sharing…') : 'Share'}
          </Text>
        </PressableScale>
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
  tagBlock: {
    gap: 8,
  },
  tagLabel: {
    color: Colors.light.text,
    fontWeight: '800',
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pollBox: {
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollRemove: {
    marginLeft: 'auto',
    color: Colors.light.muted,
    fontWeight: '700',
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollOptionInput: {
    flex: 1,
  },
  pollAdd: {
    color: Colors.light.tint,
    fontWeight: '800',
    paddingVertical: 4,
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
