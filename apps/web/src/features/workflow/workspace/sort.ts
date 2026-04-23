import type { RecordIndexSortDefinition } from "~/features/record-index/model/sort";
import type { LeadListRowView } from "~/server/workflow/application/queries/views/lead-list";

export type LeadSortKey =
  | "createdAt_desc"
  | "createdAt_asc"
  | "ruc_asc"
  | "ruc_desc";

export const LEAD_WORKSPACE_SORTS = [
  { value: "createdAt_desc", label: "Newest first" },
  { value: "createdAt_asc", label: "Oldest first" },
  { value: "ruc_asc", label: "RUC A-Z" },
  { value: "ruc_desc", label: "RUC Z-A" },
] as const satisfies ReadonlyArray<{ label: string; value: LeadSortKey }>;

export function sortLeadRows(leads: LeadListRowView[], sortKey: LeadSortKey) {
  const items = [...leads];

  items.sort((left, right) => {
    switch (sortKey) {
      case "createdAt_desc":
        return right.createdAt - left.createdAt;
      case "createdAt_asc":
        return left.createdAt - right.createdAt;
      case "ruc_asc":
        return left.ruc.localeCompare(right.ruc);
      case "ruc_desc":
        return right.ruc.localeCompare(left.ruc);
      default:
        sortKey satisfies never;
        return 0;
    }
  });

  return items;
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
