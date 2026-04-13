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
    label: "Mis prospectos",
    filters: (userId: number): LeadListFilters => ({ executiveId: userId }),
  },
  {
    id: "review",
    label: "Revisión",
    filters: (): LeadListFilters => ({ stage: "PENDING_EXTERNAL_REVIEW" }),
    permission: "lead:review",
  },
  {
    id: "quotation",
    label: "Cotización",
    filters: (): LeadListFilters => ({ stage: "READY_FOR_QUOTATION" }),
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
