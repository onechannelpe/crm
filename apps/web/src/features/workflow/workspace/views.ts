import { hasPermission } from "~/lib/auth/access/rbac";
import type { Permission } from "~/lib/auth/access/rbac";

import type { LeadListFilters } from "../data/types";

export type WorkspaceView = {
  readonly id: string;
  readonly label: string;
  readonly filters: (actorUserId: number) => LeadListFilters;
  readonly permission?: Permission;
};

export const WORKSPACE_VIEWS: ReadonlyArray<WorkspaceView> = [
  {
    id: "mine",
    label: "Mis clientes",
    filters: (userId: number): LeadListFilters => ({ executiveId: userId }),
  },
  {
    id: "review",
    label: "Revisión",
    filters: (): LeadListFilters => ({ stage: "QUALIFYING" }),
    permission: "lead:review",
  },
  {
    id: "quotation",
    label: "Cotización",
    filters: (): LeadListFilters => ({ stage: "QUOTING" }),
    permission: "quotation:manage",
  },
  {
    id: "all",
    label: "Todos",
    filters: (): LeadListFilters => ({}),
    permission: "lead:view:all",
  },
];

const DEFAULT_VIEW_BY_ROLE: Partial<Record<string, string>> = {
  supervisor: "all",
  sales_manager: "all",
  back_office: "review",
  admin: "all",
  superuser: "all",
};

export function viewsForRole(role: string): WorkspaceView[] {
  return WORKSPACE_VIEWS.filter(
    (v) => !v.permission || hasPermission(role, v.permission),
  );
}

export function defaultViewIdForRole(role: string): string {
  const views = viewsForRole(role);
  const configured = DEFAULT_VIEW_BY_ROLE[role];
  if (configured && views.some((v) => v.id === configured)) return configured;
  return views[0].id;
}
