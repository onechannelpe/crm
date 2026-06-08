// Rate-negotiation policy caps. Canonical owner of these limits: imported by the
// domain transition (authoritative enforcement), the action-availability policy,
// and the client form (non-authoritative UX mirror). Keep a single source so the
// client cap can never drift from the server cap.
export const MAX_NEGOTIATION_FILES = 3;
export const MAX_NEGOTIATION_ROUNDS = 3;
