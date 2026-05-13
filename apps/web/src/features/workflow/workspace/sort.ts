import type { LeadListRowView } from "~/contracts/workflow";
import type { RecordIndexSortDefinition } from "~/features/record-index/model/sort";

import type { LeadListFilters } from "../data/types";

export type LeadSortKey =
  | "createdAt_desc"
  | "createdAt_asc"
  | "updatedAt_desc"
  | "updatedAt_asc"
  | "registeredBy_asc"
  | "registeredBy_desc"
  | "ruc_asc"
  | "ruc_desc";

export const LEAD_WORKSPACE_SORTS = [
  { value: "createdAt_desc", label: "Más recientes" },
  { value: "createdAt_asc", label: "Más antiguos" },
  { value: "updatedAt_desc", label: "Más recientes" },
  { value: "updatedAt_asc", label: "Más antiguos" },
  { value: "registeredBy_asc", label: "A-Z" },
  { value: "registeredBy_desc", label: "Z-A" },
  { value: "ruc_asc", label: "A-Z" },
  { value: "ruc_desc", label: "Z-A" },
] as const satisfies ReadonlyArray<{ label: string; value: LeadSortKey }>;

export function sortLeadRows(leads: LeadListRowView[], sortKey: LeadSortKey) {
  void sortKey;
  return leads;
}

export function resolveLeadWorkspaceSortQuery(
  value: string | undefined,
): Pick<LeadListFilters, "sortBy" | "sortDirection"> {
  switch (value) {
    case "createdAt_asc":
      return { sortBy: "createdAt", sortDirection: "asc" };
    case "updatedAt_desc":
      return { sortBy: "updatedAt", sortDirection: "desc" };
    case "updatedAt_asc":
      return { sortBy: "updatedAt", sortDirection: "asc" };
    case "registeredBy_asc":
      return { sortBy: "registeredBy", sortDirection: "asc" };
    case "registeredBy_desc":
      return { sortBy: "registeredBy", sortDirection: "desc" };
    case "ruc_asc":
      return { sortBy: "ruc", sortDirection: "asc" };
    case "ruc_desc":
      return { sortBy: "ruc", sortDirection: "desc" };
    case "createdAt_desc":
    default:
      return { sortBy: "createdAt", sortDirection: "desc" };
  }
}

export const LEAD_WORKSPACE_SORT: RecordIndexSortDefinition<
  LeadListRowView,
  LeadSortKey
> = {
  label: "Ordenar",
  menuId: "lead-workspace-sort-menu",
  options: LEAD_WORKSPACE_SORTS,
  defaultValue: "createdAt_desc",
  apply: sortLeadRows,
};
