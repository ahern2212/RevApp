import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PressableScale } from '@/components/PressableScale';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
import { showError } from '@/lib/confirm';
import { pollPercentages } from '@/lib/pollRules';
import { fetchPoll, type Poll, votePoll } from '@/lib/polls';

/**
 * A post's poll. Before you vote you see the answers as buttons; after voting (or on your
 * own post) you see results bars that grow in, with your pick marked.
 */
export function PollCard({ postId, authorId }: { postId: string; authorId: string }) {
  const { user } = useGarage();
  const userId = user?.id;
  const isAuthor = userId === authorId;
  const [loaded, setLoaded] = useState<{ postId: string; poll: Poll | null } | null>(null);
  const [voting, setVoting] = useState(false);
  const poll = loaded?.postId === postId ? loaded.poll : null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchPoll(postId, userId)
      .then((next) => !cancelled && setLoaded({ postId, poll: next }))
      .catch((error) => console.warn('Failed to load poll', error));
    return () => {
      cancelled = true;
    };
  }, [postId, userId]);

  if (!poll) return null;

  const showResults = poll.myVote !== null || isAuthor;
  const percents = pollPercentages(poll.counts);
  const total = poll.counts.reduce((sum, count) => sum + count, 0);

  const vote = async (index: number) => {
    if (voting || poll.myVote !== null) return;
    const before = poll;
    // Optimistic: show the results straight away, undo if the vote doesn't save.
    setLoaded({
      postId,
      poll: { ...poll, myVote: index, counts: poll.counts.map((count, i) => (i === index ? count + 1 : count)) },
    });
    setVoting(true);
    try {
      await votePoll(postId, index);
    } catch (error) {
      setLoaded({ postId, poll: before });
      showError('Could not vote', error);
    } finally {
      setVoting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={15} color={Colors.light.tint} />
        <Text style={styles.question}>{poll.question}</Text>
      </View>
      {poll.options.map((option, index) =>
        showResults ? (
          <View key={option} style={styles.result} accessibilityLabel={`${option}, ${percents[index]} percent`}>
            <Animated.View
              style={[styles.bar, { width: `${percents[index]}%` }, index === poll.myVote && styles.barMine]}
            />
            <Text style={[styles.optionText, index === poll.myVote && styles.optionMine]} numberOfLines={1}>
              {option}
              {index === poll.myVote ? '  ✓' : ''}
            </Text>
            <Text style={styles.percent}>{percents[index]}%</Text>
          </View>
        ) : (
          <PressableScale
            key={option}
            onPress={() => vote(index)}
            disabled={voting}
            accessibilityRole="button"
            accessibilityLabel={`Vote ${option}`}
            scaleTo={0.97}
            style={styles.option}>
            <Text style={styles.optionButtonText}>{option}</Text>
          </PressableScale>
        )
      )}
      <Text style={styles.total}>
        {total} {total === 1 ? 'vote' : 'votes'}
        {showResults ? '' : ' · tap an answer to vote'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginTop: 12,
    padding: 12,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  question: {
    flex: 1,
    color: Colors.light.text,
    fontWeight: '800',
    fontSize: 15,
  },
  option: {
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  optionButtonText: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.light.background,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  // Grows in from the left when the results appear (a CSS keyframe animation).
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Colors.light.avatar,
    transformOrigin: 'left',
    animationName: {
      from: { transform: [{ scaleX: 0 }] },
      to: { transform: [{ scaleX: 1 }] },
    },
    animationDuration: 600,
    animationTimingFunction: 'ease-out',
  },
  barMine: {
    backgroundColor: Colors.light.tint,
    opacity: 0.35,
  },
  optionText: {
    flex: 1,
    color: Colors.light.text,
    fontWeight: '600',
  },
  optionMine: {
    fontWeight: '800',
  },
  percent: {
    color: Colors.light.text,
    fontWeight: '800',
    marginLeft: 8,
  },
  total: {
    color: Colors.light.muted,
    fontSize: 12,
  },
});
