import type { Tier } from './events';

export function deriveTierFromDistressScore(distressScore?: number | null): Tier | undefined {
  if (distressScore == null) {
    return undefined;
  }

  if (distressScore >= 8) {
    return 'unwell';
  }

  if (distressScore >= 5) {
    return 'distressed';
  }

  return 'at_risk';
}
