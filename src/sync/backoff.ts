const STEP_MS = [5_000, 15_000, 60_000, 5 * 60_000];
const MAX_MS = 15 * 60_000;

export function computeNextRetryAt(attemptsSoFar: number): string {
  const delay = STEP_MS[Math.min(attemptsSoFar, STEP_MS.length - 1)] ?? MAX_MS;
  return new Date(Date.now() + Math.min(delay, MAX_MS)).toISOString();
}
