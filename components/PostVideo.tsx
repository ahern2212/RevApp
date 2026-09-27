import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useVideoPlayer, type VideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useVideoMuted } from '@/lib/videoSound';

// The player is an imperative native object; its sound is set directly.
function setMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}

type Props = {
  uri: string;
  posterUri: string;
  /** Only the active video loads and plays; others just show their poster. */
  active: boolean;
  /** Show the platform's playback controls (post page). Otherwise it's a looping feed video. */
  controls?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Instagram-style video: poster first, then plays muted and loops while it's on screen. */
export function PostVideo({ uri, posterUri, active, controls = false, style }: Props) {
  const focused = useIsFocused();
  const muted = useVideoMuted();
  const playing = active && focused;
  // A null source keeps off-screen players empty so they don't hold a decoder.
  const player = useVideoPlayer(playing ? uri : null, (p) => {
    p.loop = true;
    p.muted = muted;
  });
  const [shownFor, setShownFor] = useState<string | null>(null);
  const firstFrameShown = playing && shownFor === uri;

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [player, playing]);

  // With native controls the viewer manages sound themselves after the first play.
  useEffect(() => {
    if (!controls) setMuted(player, muted);
  }, [player, muted, controls]);

  return (
    <View style={[styles.frame, style]}>
      <Image source={{ uri: posterUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      {playing ? (
        <View style={[StyleSheet.absoluteFill, !firstFrameShown && styles.hidden]} pointerEvents={controls ? 'auto' : 'none'}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit={controls ? 'contain' : 'cover'}
            nativeControls={controls}
            onFirstFrameRender={() => setShownFor(uri)}
          />
        </View>
      ) : null}
      {!controls ? (
        <View style={styles.badge} pointerEvents="none">
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={14} color="#ffffff" />
        </View>
      ) : null}
      {!controls && !playing ? (
        <View style={styles.play} pointerEvents="none">
          <Ionicons name="play" size={36} color="#ffffff" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  hidden: {
    opacity: 0,
  },
  badge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
});
