import { Image } from 'expo-image';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { gridShape } from '@/lib/gridLayout';

type Props = {
  uris: string[];
  /** Size of the whole grid, e.g. { width: '100%', aspectRatio: 4 / 5 }. */
  style?: StyleProp<ViewStyle>;
  /** Makes each tile tappable (the post page opens that photo full screen). */
  onPressTile?: (index: number) => void;
};

const GAP = 2;

/** A grid post: 2–6 photos tiled in one frame. */
export function MediaGrid({ uris, style, onPressTile }: Props) {
  const shape = gridShape(uris.length);

  const tile = (index: number) => {
    const uri = uris[index];
    if (!uri) return null;
    const image = <Image source={{ uri }} style={styles.fill} contentFit="cover" transition={150} />;
    return onPressTile ? (
      <Pressable
        key={index}
        onPress={() => onPressTile(index)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Photo ${index + 1} of ${uris.length}. View full screen`}
        style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
        {image}
      </Pressable>
    ) : (
      <View key={index} style={styles.tile} accessibilityLabel={`Photo ${index + 1} of ${uris.length}`}>
        {image}
      </View>
    );
  };

  return (
    <View style={[styles.frame, style]}>
      {shape.kind === 'feature' ? (
        <View style={styles.row}>
          <View style={styles.feature}>{tile(shape.main)}</View>
          <View style={styles.column}>{shape.side.map(tile)}</View>
        </View>
      ) : (
        shape.rows.map((row) => (
          <View key={row.join('-')} style={styles.row}>
            {row.map(tile)}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    gap: GAP,
    overflow: 'hidden',
    backgroundColor: Colors.light.imagePlaceholder,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },
  column: {
    flex: 1,
    gap: GAP,
  },
  feature: {
    flex: 1.5,
  },
  tile: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
});
