import type { LeadRow } from "./columns";

export const LEADS_RECORD_INDEX_FILTERS = [
  { value: "all", label: "All prospects" },
  { value: "NEW", label: "New" },
  { value: "NEEDS_EXECUTIVE_INPUT", label: "Needs executive input" },
  { value: "READY_FOR_SALE", label: "Ready for sale" },
] as const;

export type LeadStageFilterValue =
  (typeof LEADS_RECORD_INDEX_FILTERS)[number]["value"];

export function applyLeadStageFilter(
  rows: LeadRow[],
  filterValue: LeadStageFilterValue,
) {
  if (filterValue === "all") {
    return rows;
  }

  return rows.filter((row) => row.stage === filterValue);
}
