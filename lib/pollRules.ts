// Poll rules shared with the database (supabase/migrations/20260928160000_grid_posts_and_polls.sql).
// Kept free of app imports so they can be unit-tested.

export const POLL_QUESTION_MAX = 120;
export const POLL_OPTION_MAX = 40;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 4;

export type PollDraft = { question: string; options: string[] };

/** A readable problem with the poll, or null if it can be posted. Blank extra answers are ignored. */
export function checkPoll(draft: PollDraft): string | null {
  const question = draft.question.trim();
  const options = draft.options.map((option) => option.trim()).filter(Boolean);
  if (!question) return 'Add a question for your poll.';
  if (question.length > POLL_QUESTION_MAX) return `Keep the question under ${POLL_QUESTION_MAX} characters.`;
  if (options.length < POLL_MIN_OPTIONS) return `Add at least ${POLL_MIN_OPTIONS} answers.`;
  if (options.length > POLL_MAX_OPTIONS) return `Polls can have up to ${POLL_MAX_OPTIONS} answers.`;
  if (options.some((option) => option.length > POLL_OPTION_MAX)) {
    return `Keep each answer under ${POLL_OPTION_MAX} characters.`;
  }
  const unique = new Set(options.map((option) => option.toLowerCase()));
  if (unique.size !== options.length) return 'Each answer needs to be different.';
  return null;
}

/** The trimmed, non-blank answers to save. */
export function cleanPoll(draft: PollDraft): PollDraft {
  return {
    question: draft.question.trim(),
    options: draft.options.map((option) => option.trim()).filter(Boolean),
  };
}

/**
 * Whole-number percentages that always add up to 100 (largest remainder method), so the
 * bars never show 33 + 33 + 33. All zeros when nobody has voted.
 */
export function pollPercentages(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return counts.map(() => 0);
  const exact = counts.map((count) => (count / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (left <= 0) break;
    floors[index] += 1;
    left -= 1;
  }
  return floors;
}
