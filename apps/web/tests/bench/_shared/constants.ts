export const BENCH_NOW_MS = 1_700_000_000_000;
export const BENCH_NOW = new Date(BENCH_NOW_MS);
export const BENCH_DATE = "2030-01-01";
export const COMPONENT_ITERATIONS = 25_000;

export function benchDate(offsetMs = 0): Date {
  return new Date(BENCH_NOW_MS + offsetMs);
}
