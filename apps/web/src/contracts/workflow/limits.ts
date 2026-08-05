// Cap on files per rate-revision request. Three covers the typical documents
// the back office asks for (addendum, signed photo, PDF) without inviting
// unbounded uploads.
export const MAX_RATE_REVISION_FILES = 3;

// Cap on revision rounds per lead. Three is the product-spec ceiling: after
// that the lead is closed rather than looped on the same proposal.
export const MAX_RATE_REVISION_ROUNDS = 3;

// Floor on a lead's GPV. Below this the merchant isn't a viable prospect for
// the product line, so the commercial scope should not record it as one.
export const MIN_GPV = 1000;
