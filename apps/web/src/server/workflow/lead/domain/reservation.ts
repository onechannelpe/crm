const DAY_MS = 24 * 60 * 60 * 1000;

export function computeReservationExpiry(input: {
  reservedAt: Date;
  validityDays: number;
}): Date {
  return new Date(input.reservedAt.getTime() + input.validityDays * DAY_MS);
}

export function isReservationActive(
  lead: { reservationExpiresAt: Date | null },
  activeAsOf: Date,
): boolean {
  return (
    lead.reservationExpiresAt !== null && lead.reservationExpiresAt > activeAsOf
  );
}

export function isReservationLapsed(
  lead: { reservationExpiresAt: Date | null },
  lapsedAsOf: Date,
): boolean {
  return (
    lead.reservationExpiresAt !== null &&
    lead.reservationExpiresAt <= lapsedAsOf
  );
}
