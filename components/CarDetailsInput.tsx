import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import {
  type CarDetails,
  fetchModels,
  formatCar,
  isValidYear,
  MAKES,
  suggest,
} from '@/lib/vehicles';

type Field = 'make' | 'model';

type Props = {
  value: CarDetails;
  onChange: (next: CarDetails) => void;
};

function Suggestions({ options, onPick }: { options: string[]; onPick: (option: string) => void }) {
  if (options.length === 0) return null;
  return (
    <View style={styles.chips}>
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onPick(option)}
          accessibilityRole="button"
          accessibilityLabel={`Use ${option}`}
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
          <Text style={styles.chipText}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function CarDetailsInput({ value, onChange }: Props) {
  const makeRef = useRef<TextInput>(null);
  const modelRef = useRef<TextInput>(null);
  const [active, setActive] = useState<Field | null>(null);
  const [models, setModels] = useState<{ key: string; list: string[] } | null>(null);

  const knownMake = MAKES.find((m) => m.toLowerCase() === value.make.trim().toLowerCase());
  const year = isValidYear(value.year) ? value.year : undefined;
  const modelsKey = knownMake ? `${knownMake}|${year ?? ''}` : null;
  const modelList = models && models.key === modelsKey ? models.list : null;
  const loadingModels = modelsKey !== null && modelList === null;

  useEffect(() => {
    if (!knownMake || !modelsKey) return;
    let cancelled = false;
    fetchModels(knownMake, year)
      .then((list) => !cancelled && setModels({ key: modelsKey, list }))
      .catch(() => !cancelled && setModels({ key: modelsKey, list: [] }));
    return () => {
      cancelled = true;
    };
  }, [knownMake, year, modelsKey]);

  const update = (patch: Partial<CarDetails>) => onChange({ ...value, ...patch });

  // Delay hiding so a tap on a suggestion lands before the list unmounts (web blurs first).
  const blur = (field: Field) => () =>
    setTimeout(() => setActive((current) => (current === field ? null : current)), 200);

  const setYear = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    update({ year: digits });
    if (digits.length === 4 && isValidYear(digits)) makeRef.current?.focus();
  };

  const pickMake = (make: string) => {
    update({ make });
    modelRef.current?.focus();
  };

  const pickModel = (model: string) => {
    update({ model });
    setActive(null);
    modelRef.current?.blur();
  };

  const preview = formatCar(value);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          value={value.year}
          onChangeText={setYear}
          placeholder="Year"
          placeholderTextColor={Colors.light.placeholder}
          keyboardType="number-pad"
          maxLength={4}
          accessibilityLabel="Car year"
          style={[styles.input, styles.year]}
        />
        <TextInput
          ref={makeRef}
          value={value.make}
          onChangeText={(make) => update({ make })}
          onFocus={() => setActive('make')}
          onBlur={blur('make')}
          placeholder="Make (e.g. Honda)"
          placeholderTextColor={Colors.light.placeholder}
          autoCorrect={false}
          maxLength={30}
          returnKeyType="next"
          onSubmitEditing={() => modelRef.current?.focus()}
          accessibilityLabel="Car make"
          style={[styles.input, styles.flex]}
        />
      </View>
      {active === 'make' ? <Suggestions options={suggest(MAKES, value.make)} onPick={pickMake} /> : null}

      <TextInput
        ref={modelRef}
        value={value.model}
        onChangeText={(model) => update({ model })}
        onFocus={() => setActive('model')}
        onBlur={blur('model')}
        placeholder="Model (e.g. Civic Type R)"
        placeholderTextColor={Colors.light.placeholder}
        autoCorrect={false}
        maxLength={40}
        accessibilityLabel="Car model"
        style={styles.input}
      />
      {active === 'model' && loadingModels ? (
        <View style={styles.status}>
          <ActivityIndicator size="small" color={Colors.light.tint} />
          <Text style={styles.statusText}>Finding {knownMake} models…</Text>
        </View>
      ) : null}
      {active === 'model' && modelList ? (
        <Suggestions options={suggest(modelList, value.model)} onPick={pickModel} />
      ) : null}

      {preview ? <Text style={styles.preview}>Shows as: {preview}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
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
  year: {
    width: 92,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipPressed: {
    backgroundColor: Colors.light.avatar,
  },
  chipText: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: Colors.light.muted,
  },
  preview: {
    color: Colors.light.muted,
    fontSize: 13,
  },
});
