import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemePreview } from '@/components/ThemePreview';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors, { activeTheme } from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { type AppTheme, THEMES } from '@/constants/themes';
import { useGarage } from '@/context/GarageContext';
import { showError } from '@/lib/confirm';
import { reloadApp, saveThemeId } from '@/lib/themeStore';
import { castThemeVote, fetchThemeTally, type ThemeTally, withdrawThemeVote } from '@/lib/themeVotes';

export default function ThemesScreen() {
  const { user } = useGarage();
  const userId = user?.id;
  const [tally, setTally] = useState<ThemeTally | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [applying, setApplying] = useState<AppTheme | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setTally(await fetchThemeTally(userId));
      setFailed(false);
    } catch (error) {
      console.warn('Failed to load theme votes', error);
      setFailed(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const leader = tally
    ? THEMES.reduce<AppTheme | null>((best, theme) => {
        const votes = tally.counts[theme.id] ?? 0;
        return votes > 0 && votes > (best ? (tally.counts[best.id] ?? 0) : 0) ? theme : best;
      }, null)
    : null;

  const vote = async (theme: AppTheme) => {
    if (!userId || !tally || saving) return;
    const previous = tally;
    const withdrawing = tally.mine === theme.id;
    // Optimistic update of the counts; roll back on failure.
    const counts = { ...tally.counts };
    if (tally.mine) counts[tally.mine] = Math.max(0, (counts[tally.mine] ?? 0) - 1);
    if (!withdrawing) counts[theme.id] = (counts[theme.id] ?? 0) + 1;
    setTally({
      counts,
      total: tally.total + (tally.mine ? 0 : 1) - (withdrawing ? 1 : 0),
      mine: withdrawing ? null : theme.id,
    });
    setSaving(theme.id);
    try {
      if (withdrawing) {
        await withdrawThemeVote(userId);
      } else {
        await castThemeVote(userId, theme.id);
        // Voting also switches this device to the theme (app restarts to repaint).
        if (theme.id !== activeTheme.id) {
          saveThemeId(theme.id);
          setApplying(theme);
          setTimeout(() => {
            if (!reloadApp()) {
              setApplying(null);
              showError(
                'Theme saved',
                new Error(`Close and reopen RevApp to see ${theme.name}.`)
              );
            }
          }, 600);
        }
      }
    } catch (error) {
      setTally(previous);
      showError('Could not save your vote', error);
    } finally {
      setSaving(null);
    }
  };

  if (applying) {
    return (
      <View style={[styles.applying, { backgroundColor: applying.colors.background }]}>
        <ActivityIndicator color={applying.colors.tint} size="large" />
        <Text style={[styles.applyingText, { color: applying.colors.text }]}>
          Switching to {applying.name}…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView style={styles.list} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Vote for your favorite palette — RevApp switches to it on your device right away, and the
        most popular one can become the look for everyone. Change your vote any time.
      </Text>

      {failed ? (
        <Text style={styles.error}>
          Voting isn’t available yet (the database update may not be installed). You can still
          browse the palettes.
        </Text>
      ) : !tally ? (
        <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
      ) : (
        <Text style={styles.total}>
          {tally.total} {tally.total === 1 ? 'vote' : 'votes'} so far
        </Text>
      )}

      {THEMES.map((theme) => {
        const votes = tally?.counts[theme.id] ?? 0;
        const share = tally && tally.total > 0 ? votes / tally.total : 0;
        const mine = tally?.mine === theme.id;
        const current = theme.id === activeTheme.id;
        return (
          <View key={theme.id} style={[styles.card, mine && styles.cardMine]}>
            <ThemePreview theme={theme} />
            <View style={styles.details}>
              <View style={styles.badges}>
                {current ? <Text style={[styles.badge, styles.badgeCurrent]}>Current</Text> : null}
                {leader?.id === theme.id ? <Text style={[styles.badge, styles.badgeLeader]}>Leading</Text> : null}
              </View>
              <Text style={styles.name}>{theme.name}</Text>
              <Text style={styles.tagline}>{theme.tagline}</Text>
              <View style={styles.swatches}>
                {theme.swatches.map((hex) => (
                  <View key={hex} style={[styles.swatch, { backgroundColor: hex }]} />
                ))}
              </View>
              {tally ? (
                <View style={styles.meter} accessibilityLabel={`${votes} votes`}>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
                  </View>
                  <Text style={styles.votes}>
                    {votes} · {Math.round(share * 100)}%
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => vote(theme)}
                disabled={!tally || failed || saving !== null}
                accessibilityRole="button"
                accessibilityState={{ selected: mine, disabled: !tally || failed || saving !== null }}
                style={[styles.voteButton, mine && styles.voteButtonMine, (!tally || failed) && styles.disabled]}>
                <Ionicons
                  name={mine ? 'checkmark-circle' : 'thumbs-up-outline'}
                  size={16}
                  color={mine ? Colors.light.onTint : Colors.light.tint}
                />
                <Text style={[styles.voteText, mine && styles.voteTextMine]}>
                  {mine ? 'Your vote' : current ? 'Vote' : 'Vote & use'}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Text style={styles.footnote}>
        The palette with the most votes can be switched on for everyone in a single update.
      </Text>
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
    backgroundColor: Colors.light.background,
  },
  list: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  applying: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  applyingText: {
    fontSize: 17,
    fontWeight: '800',
  },
  intro: {
    color: Colors.light.text,
    lineHeight: 21,
    fontSize: 15,
  },
  total: {
    color: Colors.light.muted,
    fontWeight: '700',
  },
  error: {
    color: Colors.light.danger,
    lineHeight: 20,
  },
  loading: {
    marginVertical: 8,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderRadius: 16,
    ...glass,
  },
  cardMine: {
    borderColor: Colors.light.tint,
    borderWidth: 2,
  },
  details: {
    flex: 1,
    gap: 6,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    minHeight: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  badgeCurrent: {
    color: Colors.light.text,
    backgroundColor: Colors.light.avatar,
  },
  badgeLeader: {
    color: Colors.light.onTint,
    backgroundColor: Colors.light.tint,
  },
  name: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: '900',
  },
  tagline: {
    color: Colors.light.muted,
    lineHeight: 18,
  },
  swatches: {
    flexDirection: 'row',
    gap: 4,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  meter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.background,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.light.tint,
  },
  votes: {
    color: Colors.light.muted,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 52,
    textAlign: 'right',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 2,
  },
  voteButtonMine: {
    backgroundColor: Colors.light.tint,
  },
  disabled: {
    opacity: 0.4,
  },
  voteText: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  voteTextMine: {
    color: Colors.light.onTint,
  },
  footnote: {
    color: Colors.light.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
