export interface SeedContext {
  anchorDate: Date;
  randomSeed: number;
}

export function createSeedContext(anchorDate = new Date()): SeedContext {
  return {
    anchorDate,
    randomSeed: 0x5eed_9b7,
  };
}

export function daysBefore(context: SeedContext, days: number): Date {
  return new Date(context.anchorDate.getTime() - days * 86_400_000);
}
