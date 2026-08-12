export interface SeedContext {
  anchorDate: Date;
  randomSeed: number;
}

// Every seeded row is offset from `anchorDate`, never from a fresh clock read,
// so one run produces one internally consistent dataset. Callers may pass a
// fixed anchor to make a run reproducible.
// clock-boundary: seed run start
export function createSeedContext(anchorDate = new Date()): SeedContext {
  return {
    anchorDate,
    randomSeed: 0x5eed_9b7,
  };
}

export function daysBefore(context: SeedContext, days: number): Date {
  return new Date(context.anchorDate.getTime() - days * 86_400_000);
}
