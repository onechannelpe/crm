export const MAX_RATE_REVISION_FILES = 3;
export const MAX_RATE_REVISION_ROUNDS = 3;

// An executive may hold at most this many quotations awaiting their decision
// (in PRICING with a pending proposal). Registering a new client is blocked
// until one is accepted, sent to revision, or closed. Forces executives to act
// on the quotations they have rather than hoarding pipeline.
export const MAX_PENDING_QUOTATION_DECISIONS = 3;
