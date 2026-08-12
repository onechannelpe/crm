import type { PayoutBand } from "~/domain/merchant-stats/commission";

// Bands aren't required to be contiguous (see validatePayoutBands), so a
// value can legitimately fall in a gap -- that reads as "no band configured
// for this value yet", not an error.
export function findBand(
  bands: readonly PayoutBand[],
  value: number,
): PayoutBand | null {
  return (
    bands.find(
      (band) => value >= band.min && (band.max === null || value <= band.max),
    ) ?? null
  );
}
