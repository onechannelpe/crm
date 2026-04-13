import type { RecordIndexFilterDefinition } from "~/features/record-index/model/filter";
import type { LeadListRowView } from "~/server/pipeline/application/queries/views/lead-list";

export const LEAD_WORKSPACE_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "PENDING_EXTERNAL_REVIEW", label: "Pendientes de revisión" },
  { value: "NEEDS_EXECUTIVE_INPUT", label: "Necesitan mi información" },
  { value: "READY_FOR_QUOTATION", label: "Listos para cotizar" },
  { value: "READY_FOR_SALE", label: "Listos para venta" },
  { value: "REJECTED_BY_STATUS", label: "Rechazados" },
] as const;

export type LeadStageFilterValue =
  (typeof LEAD_WORKSPACE_FILTERS)[number]["value"];

export function applyLeadStageFilter(
  rows: LeadListRowView[],
  filterValue: LeadStageFilterValue,
) {
  if (filterValue === "all") {
    return rows;
  }

  return rows.filter((row) => row.stage === filterValue);
}

export const LEAD_WORKSPACE_FILTER: RecordIndexFilterDefinition<
  LeadListRowView,
  LeadStageFilterValue
> = {
  label: "Filtrar",
  menuId: "lead-workspace-filter-menu",
  options: LEAD_WORKSPACE_FILTERS,
  defaultValue: "all",
  apply: applyLeadStageFilter,
};
