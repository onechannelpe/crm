import type { RecordIndexFilterDefinition } from "~/features/record-index/model/filter";
import type { LeadListRowView } from "~/server/workflow/application/queries/views/lead-list";

export const LEAD_WORKSPACE_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "updated_today", label: "Hoy" },
  {
    value: "stage:PENDING_EXTERNAL_REVIEW",
    label: "Pendiente revisión",
  },
  {
    value: "stage:NEEDS_EXECUTIVE_INPUT",
    label: "Necesita información ejecutiva",
  },
  { value: "stage:READY_FOR_QUOTATION", label: "Listo para cotizar" },
  { value: "stage:QUOTED", label: "Cotizado" },
  { value: "stage:READY_FOR_SALE", label: "Listo para venta" },
  { value: "stage:CONVERTED", label: "Convertido" },
  { value: "stage:REJECTED_BY_STATUS", label: "Rechazado" },
  { value: "status:DISPONIBLE", label: "Disponible" },
  { value: "status:SIN RESULTADO", label: "Sin resultado" },
  { value: "status:CARTERIZADO", label: "Carterizado" },
  { value: "status:STOCK", label: "Stock" },
] as const;

export type LeadWorkspaceFilterValue =
  (typeof LEAD_WORKSPACE_FILTERS)[number]["value"];

function isTimestampFromToday(timestamp: number): boolean {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const end = start + 24 * 60 * 60 * 1000;

  return timestamp >= start && timestamp < end;
}

export function applyLeadWorkspaceFilter(
  rows: LeadListRowView[],
  filterValue: LeadWorkspaceFilterValue,
) {
  if (filterValue === "all") {
    return rows;
  }

  if (filterValue === "updated_today") {
    return rows.filter((row) => isTimestampFromToday(row.updatedAt));
  }

  if (filterValue.startsWith("stage:")) {
    const stage = filterValue.slice("stage:".length);
    return rows.filter((row) => row.stage === stage);
  }

  if (filterValue.startsWith("status:")) {
    const status = filterValue.slice("status:".length);
    return rows.filter((row) => row.status === status);
  }

  return rows;
}

export const LEAD_WORKSPACE_FILTER: RecordIndexFilterDefinition<
  LeadListRowView,
  LeadWorkspaceFilterValue
> = {
  label: "Filtrar",
  menuId: "lead-workspace-filter-menu",
  options: LEAD_WORKSPACE_FILTERS,
  defaultValue: "all",
  apply: applyLeadWorkspaceFilter,
};
