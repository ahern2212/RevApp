import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

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
const THUMB = 64;

type Section = 'car' | 'meet' | 'poll';

/** One collapsible "details" row, like Instagram's "Tag people" / "Add location" rows. */
function DetailRow({
  icon,
  label,
  value,
  open,
  onToggle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Animated.View layout={LinearTransition.duration(200)} style={styles.detail}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        style={({ pressed }) => [styles.detailHeader, pressed && styles.detailPressed]}>
        <Ionicons name={icon} size={20} color={Colors.light.tint} />
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.light.muted} />
      </Pressable>
      {open ? (
        <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)} style={styles.detailBody}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/**
 * New post: photos or a video first, then a caption, then optional details (car, meet, poll)
 * tucked into rows that open when you need them. Share lives in the header.
 */
export default function PostScreen() {
  const { addPost, user } = useGarage();
  const userId = user?.id;
  const router = useRouter();
  const tabBarSpace = useTabBarSpace();

  // One video, or 1–10 photos.
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [layout, setLayout] = useState<'carousel' | 'grid'>('carousel');
  const [caption, setCaption] = useState('');
  const mentions = useMentions(caption, setCaption);
  const [open, setOpen] = useState<Section | null>(null);
  const [myCars, setMyCars] = useState<Car[]>([]);
  const [carId, setCarId] = useState<string | null>(null);
  const [car, setCar] = useState<CarDetails>(EMPTY_CAR);
  const [meets, setMeets] = useState<CarEvent[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [pollOn, setPollOn] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [busy, setBusy] = useState(false);

  const first = media[0];
  const isVideo = first?.kind === 'video';
  const photoCount = isVideo ? 0 : media.length;
  const canGrid = photoCount >= GRID_MIN && photoCount <= GRID_MAX;
  const shownLayout = canGrid ? layout : 'carousel';
  const roomLeft = isVideo ? 0 : CAROUSEL_MAX - media.length;
  const canShare = media.length > 0 && !busy && !preparing;

  // Your garage and meets, reloaded each visit so something added a moment ago shows up.
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

  // Picks new media, or adds more photos to the ones already chosen.
  const pick = async (adding: boolean) => {
    setPreparing(true);
    try {
      const picked = await pickPostMedia(adding ? { limit: roomLeft } : {});
      if (!picked) return;
      if (adding && picked.some((item) => item.kind === 'video')) {
        throw new Error('A video goes in a post on its own. Remove the photos first, or pick photos.');
      }
      setMedia((current) => (adding ? [...current, ...picked].slice(0, CAROUSEL_MAX) : picked));
    } catch (error) {
      showError('Can’t add that', error);
    } finally {
      setPreparing(false);
    }
  };

  const removeAt = (index: number) => setMedia((current) => current.filter((_, i) => i !== index));

  const toggle = (section: Section) => {
    if (section === 'poll' && !pollOn) setPollOn(true);
    setOpen((current) => (current === section ? null : section));
  };

  const tagCar = (tagged: Car) => {
    if (carId === tagged.id) {
      setCarId(null);
      return;
    }
    setCarId(tagged.id);
    setCar({ year: tagged.year, make: tagged.make, model: tagged.model });
  };

  const removePoll = () => {
    setPollOn(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setOpen(null);
  };

  const reset = () => {
    setMedia([]);
    setLayout('carousel');
    setCaption('');
    setOpen(null);
    setCarId(null);
    setCar(EMPTY_CAR);
    setEventId(null);
    removePoll();
  };

  const share = async () => {
    if (!canShare) return;
    const pollDraft = { question: pollQuestion, options: pollOptions };
    if (pollOn) {
      const problem = checkPoll(pollDraft);
      if (problem) {
        setOpen('poll');
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
        poll: pollOn ? cleanPoll(pollDraft) : null,
      });
      reset();
      router.replace('/');
    } catch (error) {
      showError('Could not share', error);
    } finally {
      setBusy(false);
    }
  };

  const taggedCar = myCars.find((c) => c.id === carId);
  const carValue = taggedCar ? taggedCar.nickname || carTitle(taggedCar) : formatCar(car) || 'Add';
  const meetValue = meets.find((m) => m.id === eventId)?.title ?? 'None';
  const pollValue = pollOn ? pollQuestion.trim() || 'Draft' : 'Add';
  const uris = media.map((item) => item.uri);

  return (
    <View style={styles.screen}>
      <Tabs.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={share}
              disabled={!canShare}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canShare, busy }}
              hitSlop={10}
              style={styles.headerShare}>
              {busy ? (
                <ActivityIndicator color={Colors.light.tint} />
              ) : (
                <Text style={[styles.headerShareText, !canShare && styles.headerShareDisabled]}>Share</Text>
              )}
            </Pressable>
          ),
        }}
      />
      <GlassBackdrop />
      <ScrollView
        style={styles.wrap}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace + 16 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        {/* ─── Media ─── */}
        {media.length === 0 ? (
          <PressableScale
            onPress={() => pick(false)}
            disabled={preparing}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel="Choose car photos or a video"
            style={styles.picker}>
            {preparing ? (
              <>
                <ActivityIndicator color={Colors.light.tint} />
                <Text style={styles.pickerText}>Checking your files…</Text>
              </>
            ) : (
              <>
                <View style={styles.pickerIcon}>
                  <Ionicons name="images" size={30} color={Colors.light.onTint} />
                </View>
                <Text style={styles.pickerTitle}>Add photos or a video</Text>
                <Text style={styles.pickerText}>
                  Up to {CAROUSEL_MAX} photos, or one video up to {VIDEO_MAX_SECONDS} s. Location data is removed.
                </Text>
              </>
            )}
          </PressableScale>
        ) : (
          <Animated.View entering={FadeIn.duration(250)} style={styles.mediaBlock}>
            <View style={styles.preview}>
              {isVideo && first?.posterUri ? (
                <PostVideo uri={first.uri} posterUri={first.posterUri} active style={styles.fill} />
              ) : media.length > 1 && shownLayout === 'grid' ? (
                <MediaGrid uris={uris} style={styles.fill} />
              ) : media.length > 1 ? (
                <MediaCarousel uris={uris} style={styles.fill} />
              ) : (
                <Image source={{ uri: first.uri }} style={styles.fill} contentFit="cover" />
              )}
            </View>

            <View style={styles.trayHeader}>
              <Text style={styles.trayCount}>
                {isVideo
                  ? `Video${first.durationMs ? ` · ${formatDuration(first.durationMs)}` : ''}`
                  : `${media.length} ${media.length === 1 ? 'photo' : 'photos'}`}
              </Text>
              {canGrid ? (
                <View style={styles.segment} accessibilityRole="radiogroup">
                  {(['carousel', 'grid'] as const).map((option) => {
                    const active = shownLayout === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setLayout(option)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        style={[styles.segmentItem, active && styles.segmentActive]}>
                        <Ionicons
                          name={option === 'grid' ? 'grid-outline' : 'copy-outline'}
                          size={14}
                          color={active ? Colors.light.onTint : Colors.light.tint}
                        />
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                          {option === 'grid' ? 'Grid' : 'Carousel'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tray}>
              {media.map((item, index) => (
                <Animated.View
                  key={item.uri}
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(150)}
                  layout={LinearTransition.duration(200)}
                  style={styles.thumbWrap}>
                  <Image source={{ uri: item.posterUri ?? item.uri }} style={styles.thumb} contentFit="cover" />
                  {index === 0 && media.length > 1 ? (
                    <View style={styles.coverTag}>
                      <Text style={styles.coverText}>Cover</Text>
                    </View>
                  ) : null}
                  {item.kind === 'video' ? (
                    <Ionicons name="play" size={16} color="#ffffff" style={styles.thumbPlay} />
                  ) : null}
                  <Pressable
                    onPress={() => removeAt(index)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.kind === 'video' ? 'video' : `photo ${index + 1}`}`}
                    style={styles.remove}>
                    <Ionicons name="close" size={14} color="#ffffff" />
                  </Pressable>
                </Animated.View>
              ))}
              {roomLeft > 0 ? (
                <Pressable
                  onPress={() => pick(true)}
                  disabled={preparing}
                  accessibilityRole="button"
                  accessibilityLabel="Add more photos"
                  style={({ pressed }) => [styles.addTile, pressed && styles.detailPressed]}>
                  {preparing ? (
                    <ActivityIndicator color={Colors.light.tint} />
                  ) : (
                    <Ionicons name="add" size={26} color={Colors.light.tint} />
                  )}
                </Pressable>
              ) : null}
            </ScrollView>
          </Animated.View>
        )}

        {/* ─── Caption ─── */}
        <TextInput
          value={caption}
          onChangeText={setCaption}
          onSelectionChange={mentions.onSelectionChange}
          placeholder="Write a caption… use #tags and @mentions"
          maxLength={CAPTION_MAX}
          placeholderTextColor={Colors.light.placeholder}
          multiline
          accessibilityLabel="Caption"
          style={[styles.input, styles.caption]}
        />
        <MentionSuggestions suggestions={mentions.suggestions} onPick={mentions.pick} />
        {caption.length > CAPTION_MAX - 200 ? (
          <Text style={styles.counter}>
            {caption.length}/{CAPTION_MAX}
          </Text>
        ) : null}

        {/* ─── Optional details ─── */}
        <View style={styles.details}>
          <DetailRow icon="car-sport-outline" label="Car" value={carValue} open={open === 'car'} onToggle={() => toggle('car')}>
            {myCars.length > 0 ? (
              <View style={styles.chips}>
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
            ) : null}
            <CarDetailsInput
              value={car}
              onChange={(details) => {
                setCar(details);
                setCarId(null); // typed a different car: drop the garage tag
              }}
            />
          </DetailRow>

          {meets.length > 0 ? (
            <DetailRow icon="location-outline" label="Meet" value={meetValue} open={open === 'meet'} onToggle={() => toggle('meet')}>
              <View style={styles.chips}>
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
            </DetailRow>
          ) : null}

          <DetailRow icon="stats-chart-outline" label="Poll" value={pollValue} open={open === 'poll'} onToggle={() => toggle('poll')}>
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
              <View key={index} style={styles.pollRow}>
                <TextInput
                  value={option}
                  onChangeText={(text) =>
                    setPollOptions((current) => current.map((value, i) => (i === index ? text : value)))
                  }
                  placeholder={`Answer ${index + 1}`}
                  placeholderTextColor={Colors.light.placeholder}
                  maxLength={POLL_OPTION_MAX}
                  accessibilityLabel={`Poll answer ${index + 1}`}
                  style={[styles.input, styles.pollInput]}
                />
                {index >= 2 ? (
                  <Pressable
                    onPress={() => setPollOptions((current) => current.filter((_, i) => i !== index))}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove answer ${index + 1}`}>
                    <Ionicons name="close-circle" size={22} color={Colors.light.muted} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            <View style={styles.pollActions}>
              {pollOptions.length < POLL_MAX_OPTIONS ? (
                <Text style={styles.link} onPress={() => setPollOptions((current) => [...current, ''])} accessibilityRole="button">
                  + Add answer
                </Text>
              ) : (
                <View />
              )}
              <Text style={styles.linkMuted} onPress={removePoll} accessibilityRole="button">
                Remove poll
              </Text>
            </View>
          </DetailRow>
        </View>

        <Text style={styles.footnote}>Keep it about cars: builds, parts, meets and car culture.</Text>
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
    gap: 14,
  },
  headerShare: {
    marginRight: 16,
    minWidth: 56,
    alignItems: 'flex-end',
  },
  headerShareText: {
    color: Colors.light.tint,
    fontWeight: '900',
    fontSize: 17,
  },
  headerShareDisabled: {
    opacity: 0.35,
  },
  picker: {
    ...glass,
    borderRadius: 20,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: Colors.light.avatar,
  },
  pickerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitle: {
    color: Colors.light.text,
    fontWeight: '900',
    fontSize: 18,
  },
  pickerText: {
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  mediaBlock: {
    gap: 10,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.light.imagePlaceholder,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  trayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  trayCount: {
    color: Colors.light.text,
    fontWeight: '800',
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    padding: 2,
    backgroundColor: Colors.light.card,
  },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  segmentActive: {
    backgroundColor: Colors.light.tint,
  },
  segmentText: {
    color: Colors.light.tint,
    fontWeight: '700',
    fontSize: 13,
  },
  segmentTextActive: {
    color: Colors.light.onTint,
  },
  tray: {
    gap: 8,
    paddingVertical: 2,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  thumbPlay: {
    position: 'absolute',
    left: 6,
    bottom: 6,
  },
  coverTag: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  coverText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(20, 16, 32, 0.8)',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.light.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.card,
  },
  input: {
    ...glass,
    shadowOpacity: 0,
    color: Colors.light.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  caption: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  counter: {
    color: Colors.light.muted,
    fontSize: 12,
    textAlign: 'right',
    marginTop: -8,
  },
  details: {
    ...glass,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detail: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  detailPressed: {
    backgroundColor: Colors.light.card,
  },
  detailLabel: {
    color: Colors.light.text,
    fontWeight: '700',
    fontSize: 15,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    color: Colors.light.muted,
  },
  detailBody: {
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollInput: {
    flex: 1,
  },
  pollActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  linkMuted: {
    color: Colors.light.muted,
    fontWeight: '700',
  },
  footnote: {
    color: Colors.light.muted,
    fontSize: 12,
    textAlign: 'center',
  },
});
