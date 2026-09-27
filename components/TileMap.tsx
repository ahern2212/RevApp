import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import {
  fitBounds,
  MAX_ZOOM,
  MIN_ZOOM,
  TILE_ATTRIBUTION,
  TILE_HEADERS,
  TILE_SIZE,
  tilesFor,
  toView,
  type LatLng,
} from '@/lib/geo';

const PIN_SIZE = 36;

export type MapMarker = LatLng & { id: string; label?: string };

type Props = {
  markers: MapMarker[];
  height?: number;
  selectedId?: string | null;
  onMarkerPress?: (id: string) => void;
};

/**
 * Lightweight map drawn from OpenStreetMap image tiles with pins on top. Works the same on
 * iOS, Android and web without a native map SDK or API key. Zoom with the +/− buttons.
 */
export function TileMap({ markers, height = 220, selectedId, onMarkerPress }: Props) {
  const [width, setWidth] = useState(0);
  const [zoomDelta, setZoomDelta] = useState(0);

  const fit = fitBounds(markers, width || 1, height, PIN_SIZE + 12);
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit.zoom + zoomDelta));
  const tiles = width > 0 ? tilesFor(fit.center, zoom, width, height) : [];
  // Native requests identify the app, as OpenStreetMap's tile policy asks.
  const headers = Platform.OS === 'web' ? undefined : TILE_HEADERS;

  return (
    <View
      style={[styles.wrap, { height }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityLabel={`Map with ${markers.length} ${markers.length === 1 ? 'location' : 'locations'}`}>
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={{ uri: tile.url, headers }}
          style={[styles.tile, { left: tile.left, top: tile.top }]}
          transition={120}
          accessibilityIgnoresInvertColors
        />
      ))}

      {width > 0
        ? markers.map((marker) => {
            const { x, y } = toView(marker, fit.center, zoom, width, height);
            if (x < -PIN_SIZE || x > width + PIN_SIZE || y < 0 || y > height + PIN_SIZE) return null;
            const selected = marker.id === selectedId;
            return (
              <Pressable
                key={marker.id}
                onPress={onMarkerPress ? () => onMarkerPress(marker.id) : undefined}
                hitSlop={6}
                accessibilityRole={onMarkerPress ? 'button' : undefined}
                accessibilityLabel={marker.label}
                style={[
                  styles.pin,
                  { left: x - PIN_SIZE / 2, top: y - PIN_SIZE },
                  selected && styles.pinSelected,
                ]}>
                <Ionicons
                  name="location"
                  size={PIN_SIZE}
                  color={selected ? Colors.light.danger : Colors.light.tint}
                  style={styles.pinIcon}
                />
              </Pressable>
            );
          })
        : null}

      <View style={styles.zoom}>
        <Pressable
          onPress={() => setZoomDelta((d) => (zoom < MAX_ZOOM ? d + 1 : d))}
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          style={styles.zoomButton}>
          <Ionicons name="add" size={18} color={Colors.light.text} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          onPress={() => setZoomDelta((d) => (zoom > MIN_ZOOM ? d - 1 : d))}
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          style={styles.zoomButton}>
          <Ionicons name="remove" size={18} color={Colors.light.text} />
        </Pressable>
      </View>

      <Text
        style={styles.attribution}
        onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
        accessibilityRole="link">
        {TILE_ATTRIBUTION}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  pin: {
    position: 'absolute',
    width: PIN_SIZE,
    height: PIN_SIZE,
  },
  pinSelected: {
    zIndex: 2,
    transform: [{ scale: 1.15 }],
  },
  pinIcon: {
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  zoom: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 34,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.light.border,
  },
  attribution: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    fontSize: 10,
    color: Colors.light.text,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 6,
  },
});
