import type { SalesRecordStatus } from "./types";

const STATUS_TRANSITIONS: Record<SalesRecordStatus, SalesRecordStatus[]> = {
  draft: ["submitted_for_confirmation", "cancelled"],
  submitted_for_confirmation: ["confirmed", "rejected"],
  rejected: ["submitted_for_confirmation", "cancelled"],
  confirmed: [],
  cancelled: [],
};

export function canTransitionSalesRecord(
  from: SalesRecordStatus,
  to: SalesRecordStatus,
): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
