import { useState } from 'react';

import { OptionsSheet } from '@/components/OptionsSheet';
import { confirm, showError, showNotice } from '@/lib/confirm';
import { blockUser, report, REPORT_REASONS, type ReportTarget, TARGET_LABELS } from '@/lib/safety';

/**
 * Report flow: call `openReport(target)`, render `reportSheet` once in the screen.
 * `onReported` runs after a successful report so the screen can drop the item.
 */
export function useReportSheet(onReported?: (target: ReportTarget) => void) {
  const [target, setTarget] = useState<ReportTarget | null>(null);

  const submit = async (reported: ReportTarget, reason: (typeof REPORT_REASONS)[number]) => {
    try {
      await report(reported, reason);
      onReported?.(reported);
      showNotice(
        'Thanks for letting us know',
        `We’ll review this ${TARGET_LABELS[reported.kind]}. You won’t see it anymore.`
      );
    } catch (error) {
      showError('Could not send report', error);
    }
  };

  const reportSheet = (
    <OptionsSheet
      visible={target !== null}
      onClose={() => setTarget(null)}
      title={target ? `Why are you reporting this ${TARGET_LABELS[target.kind]}?` : undefined}
      options={
        target
          ? REPORT_REASONS.map((reason) => ({
              label: reason,
              icon: 'flag-outline' as const,
              onPress: () => submit(target, reason),
            }))
          : []
      }
    />
  );

  return { openReport: setTarget, reportSheet };
}

/** Asks, then blocks. Resolves true if the person is now blocked. */
export async function confirmBlock(userId: string, username: string): Promise<boolean> {
  const ok = await confirm(
    `Block @${username}?`,
    'You won’t see each other’s posts, comments, threads or listings, and they can’t like or comment on yours. They won’t be told.',
    'Block'
  );
  if (!ok) return false;
  try {
    await blockUser(userId);
    showNotice(`@${username} is blocked`, 'You can unblock them any time from Edit profile → Blocked accounts.');
    return true;
  } catch (error) {
    showError('Could not block', error);
    return false;
  }
}
