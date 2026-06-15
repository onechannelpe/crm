const DAY_MS = 24 * 60 * 60 * 1000;

// A lead holds its RUC for validity_days after the last quotation round. The
// expiry timestamp is the single owner of that invariant: it is stamped on the
// lead by the priced-phase commands and read by the sweep and the registration
// guard. Snapshotting the window at quotation time (rather than recomputing
// from the current branch policy) keeps the hold stable if the policy changes.
export function computeReservationExpiry(input: {
  now: number;
  validityDays: number;
}): number {
  return input.now + input.validityDays * DAY_MS;
}

export function isReservationActive(
  lead: { reservationExpiresAt: number | null },
  now: number,
): boolean {
  return lead.reservationExpiresAt !== null && lead.reservationExpiresAt > now;
}

export function isReservationLapsed(
  lead: { reservationExpiresAt: number | null },
  now: number,
): boolean {
  return lead.reservationExpiresAt !== null && lead.reservationExpiresAt <= now;
}
