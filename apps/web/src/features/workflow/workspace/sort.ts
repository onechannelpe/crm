import type { RecordIndexSortDefinition } from "~/features/record-index/model/sort";
import type { LeadListRowView } from "~/server/workflow/application/queries/views/lead-list";

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
  const items = [...leads];

  items.sort((left, right) => {
    switch (sortKey) {
      case "createdAt_desc":
        return right.createdAt - left.createdAt;
      case "createdAt_asc":
        return left.createdAt - right.createdAt;
      case "updatedAt_desc":
        return right.updatedAt - left.updatedAt;
      case "updatedAt_asc":
        return left.updatedAt - right.updatedAt;
      case "registeredBy_asc": {
        const byName = left.createdByName.localeCompare(
          right.createdByName,
          "es",
          {
            sensitivity: "base",
          },
        );
        if (byName !== 0) {
          return byName;
        }
        return right.createdAt - left.createdAt;
      }
      case "registeredBy_desc": {
        const byName = right.createdByName.localeCompare(
          left.createdByName,
          "es",
          {
            sensitivity: "base",
          },
        );
        if (byName !== 0) {
          return byName;
        }
        return right.createdAt - left.createdAt;
      }
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
