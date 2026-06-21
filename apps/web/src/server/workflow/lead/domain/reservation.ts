const DAY_MS = 24 * 60 * 60 * 1000;

// Snapshotting the window keeps existing holds stable when policy changes.
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
