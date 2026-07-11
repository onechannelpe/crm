const DAY_MS = 24 * 60 * 60 * 1000;

export function computeReservationExpiry(input: {
  now: Date;
  validityDays: number;
}): Date {
  return new Date(input.now.getTime() + input.validityDays * DAY_MS);
}

export function isReservationActive(
  lead: { reservationExpiresAt: Date | null },
  now: Date,
): boolean {
  return lead.reservationExpiresAt !== null && lead.reservationExpiresAt > now;
}

export function isReservationLapsed(
  lead: { reservationExpiresAt: Date | null },
  now: Date,
): boolean {
  return lead.reservationExpiresAt !== null && lead.reservationExpiresAt <= now;
}
