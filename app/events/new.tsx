import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TileMap } from '@/components/TileMap';
import Colors from '@/constants/Colors';
import { showError } from '@/lib/confirm';
import { atTime, dayLabel, nextDays, parseTime } from '@/lib/datetime';
import { createEvent, formatEventTime } from '@/lib/events';
import { type Place, searchPlaces } from '@/lib/geocode';

const QUICK_TIMES = ['10 AM', '12 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM'];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function NewEventScreen() {
  const router = useRouter();
  // Computed when the form opens (not at app start) so "Today" is right after midnight.
  const [days] = useState(() => nextDays(14));
  const [openedAt] = useState(() => Date.now());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dayIndex, setDayIndex] = useState(1); // tomorrow
  const [time, setTime] = useState('7 PM');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [busy, setBusy] = useState(false);

  const parsedTime = parseTime(time);
  const startsAt = parsedTime ? atTime(days[dayIndex], parsedTime) : null;
  const inPast = startsAt !== null && startsAt.getTime() < openedAt;

  const problems = [
    title.trim().length < 3 && 'Add a title (3+ characters).',
    !parsedTime && 'Enter a time like 7 PM or 19:30.',
    inPast && 'Pick a time in the future.',
    !place && 'Search for and choose a location.',
  ].filter(Boolean) as string[];

  const search = async () => {
    if (query.trim().length < 3 || searching) return;
    setSearching(true);
    try {
      setResults(await searchPlaces(query));
    } catch (error) {
      showError('Location search failed', error);
    } finally {
      setSearching(false);
    }
  };

  const choose = (next: Place) => {
    setPlace(next);
    setPlaceName(next.name);
    setResults(null);
  };

  const create = async () => {
    if (!startsAt || !place || problems.length > 0) return;
    setBusy(true);
    try {
      const event = await createEvent({
        title,
        description,
        startsAt,
        locationName: placeName.trim() || place.name,
        latitude: place.latitude,
        longitude: place.longitude,
      });
      router.replace({ pathname: '/events/[eventId]', params: { eventId: event.id } });
    } catch (error) {
      showError('Could not create the meet', error);
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <Text style={styles.label}>What’s the meet?</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Sunday Cars & Coffee"
        placeholderTextColor={Colors.light.placeholder}
        maxLength={80}
        accessibilityLabel="Event title"
        style={styles.input}
      />

      <Text style={styles.label}>Day</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {days.map((day, index) => (
          <Chip
            key={day.toISOString()}
            label={dayLabel(day)}
            active={index === dayIndex}
            onPress={() => setDayIndex(index)}
          />
        ))}
      </ScrollView>

      <Text style={styles.label}>Time</Text>
      <View style={styles.chipsWrap}>
        {QUICK_TIMES.map((t) => (
          <Chip key={t} label={t} active={time === t} onPress={() => setTime(t)} />
        ))}
      </View>
      <TextInput
        value={time}
        onChangeText={setTime}
        placeholder="or type a time, e.g. 7:30 PM"
        placeholderTextColor={Colors.light.placeholder}
        autoCapitalize="characters"
        accessibilityLabel="Event time"
        style={[styles.input, !parsedTime && time ? styles.inputError : null]}
      />
      {startsAt && !inPast ? <Text style={styles.preview}>{formatEventTime(startsAt.getTime())}</Text> : null}

      <Text style={styles.label}>Where</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Address or place (e.g. Cal Expo, Sacramento)"
          placeholderTextColor={Colors.light.placeholder}
          returnKeyType="search"
          accessibilityLabel="Search for a location"
          style={[styles.input, styles.searchInput]}
        />
        <Pressable
          onPress={search}
          disabled={query.trim().length < 3 || searching}
          accessibilityRole="button"
          accessibilityLabel="Search location"
          style={[styles.searchButton, (query.trim().length < 3 || searching) && styles.disabled]}>
          {searching ? (
            <ActivityIndicator color={Colors.light.onTint} size="small" />
          ) : (
            <Ionicons name="search" size={20} color={Colors.light.onTint} />
          )}
        </Pressable>
      </View>

      {results ? (
        results.length === 0 ? (
          <Text style={styles.hint}>No places found. Try adding the city.</Text>
        ) : (
          <View style={styles.results}>
            {results.map((result) => (
              <Pressable
                key={`${result.latitude},${result.longitude}`}
                onPress={() => choose(result)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}>
                <Ionicons name="location-outline" size={18} color={Colors.light.tint} />
                <View style={styles.resultText}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {result.name}
                  </Text>
                  <Text style={styles.resultAddress} numberOfLines={2}>
                    {result.address}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )
      ) : null}

      {place ? (
        <>
          <TileMap
            height={180}
            markers={[{ id: 'place', latitude: place.latitude, longitude: place.longitude }]}
          />
          <TextInput
            value={placeName}
            onChangeText={setPlaceName}
            placeholder="Name shown for this spot"
            placeholderTextColor={Colors.light.placeholder}
            maxLength={200}
            accessibilityLabel="Location name"
            style={styles.input}
          />
        </>
      ) : null}

      <Text style={styles.label}>Details (optional)</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Parking info, who it's for, house rules…"
        placeholderTextColor={Colors.light.placeholder}
        maxLength={1000}
        multiline
        accessibilityLabel="Event details"
        style={[styles.input, styles.multiline]}
      />

      {problems.length > 0 ? <Text style={styles.hint}>{problems[0]}</Text> : null}
      <Pressable
        onPress={create}
        disabled={problems.length > 0 || busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: problems.length > 0 || busy, busy }}
        style={[styles.button, (problems.length > 0 || busy) && styles.disabled]}>
        <Text style={styles.buttonText}>{busy ? 'Creating…' : 'Put it on the map'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 10,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    color: Colors.light.text,
    fontWeight: '800',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    color: Colors.light.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: Colors.light.danger,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  chips: {
    gap: 8,
    paddingVertical: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: Colors.light.tint,
  },
  chipText: {
    color: Colors.light.tint,
    fontWeight: '700',
  },
  chipTextActive: {
    color: Colors.light.onTint,
  },
  preview: {
    color: Colors.light.muted,
    fontSize: 13,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    width: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  results: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    overflow: 'hidden',
  },
  result: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  resultPressed: {
    backgroundColor: Colors.light.background,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  resultAddress: {
    color: Colors.light.muted,
    fontSize: 12,
    marginTop: 2,
  },
  hint: {
    color: Colors.light.muted,
    textAlign: 'center',
    fontSize: 13,
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
