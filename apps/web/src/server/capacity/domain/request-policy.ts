import type { CapacityRequestKind } from "./types";

export function normalizeDecisionNote(
  note: string | null | undefined,
): string | null {
  const trimmed = note?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function toDbCapacityRequestKind(
  kind: CapacityRequestKind,
): "search_extra" | "lead_refill_extra" {
  return kind === "search_extra" ? "search_extra" : "lead_refill_extra";
}

export function fromDbCapacityRequestKind(
  kind: "search_extra" | "lead_refill_extra",
): CapacityRequestKind {
  return kind === "search_extra" ? "search_extra" : "lead_refill";
}
