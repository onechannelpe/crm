export const BENCH_BASE_OPTIONS = {
  throws: true,
  time: 0,
  warmupTime: 0,
  warmupIterations: 0,
} as const;

export function fixedIterations(iterations: number) {
  return {
    ...BENCH_BASE_OPTIONS,
    iterations,
  } as const;
}
