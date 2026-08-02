// Availability answers go stale: portfolios move between subcontractors, so
// a week-old DISPONIBLE is a hint, not a fact. Within the window a converted
// inquiry's answer is re-applied to the new lead (born reviewed, straight to
// pricing); past it the lead re-enters QUALIFYING and the next import cycle
// stamps it fresh.
export const INQUIRY_CARRYOVER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isAnswerFresh(answeredAt: Date, freshAsOf: Date): boolean {
  return (
    freshAsOf.getTime() - answeredAt.getTime() <= INQUIRY_CARRYOVER_WINDOW_MS
  );
}
