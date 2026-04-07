import type { LeadListRowView } from "~/actions/pipeline/contracts";

import type { RecordIndexFilterDefinition } from "../../../record-index/model/filter";

export const LEADS_RECORD_INDEX_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "PENDING_EXTERNAL_REVIEW", label: "Pendientes de revisión" },
  { value: "NEEDS_EXECUTIVE_INPUT", label: "Necesitan mi información" },
  { value: "READY_FOR_QUOTATION", label: "Listos para cotizar" },
  { value: "READY_FOR_SALE", label: "Listos para venta" },
  { value: "REJECTED_BY_STATUS", label: "Rechazados" },
] as const;

export type LeadStageFilterValue =
  (typeof LEADS_RECORD_INDEX_FILTERS)[number]["value"];

export function applyLeadStageFilter(
  rows: LeadListRowView[],
  filterValue: LeadStageFilterValue,
) {
  if (filterValue === "all") {
    return rows;
  }

  return rows.filter((row) => row.stage === filterValue);
}

export const LEADS_RECORD_INDEX_FILTER: RecordIndexFilterDefinition<
  LeadListRowView,
  LeadStageFilterValue
> = {
  label: "Filter",
  menuId: "record-index-filter-menu",
  options: LEADS_RECORD_INDEX_FILTERS,
  defaultValue: "all",
  apply: applyLeadStageFilter,
};
