import { hasPermission } from "~/lib/auth/access/rbac";
import type { Permission } from "~/lib/auth/access/rbac";

import type { LeadListFilters } from "../data/types";

export type WorkspaceView = {
  readonly id: string;
  readonly label: string;
  readonly filters: (actorUserId: number) => LeadListFilters;
  readonly permission?: Permission;
};

export const WORKSPACE_VIEWS = [
  {
    id: "mine",
    label: "Mis prospectos",
    filters: (userId: number): LeadListFilters => ({ executiveId: userId }),
  },
  {
    id: "review",
    label: "Revisión",
    filters: (): LeadListFilters => ({ stage: "PENDING_EXTERNAL_REVIEW" }),
    permission: "lead:review" as const,
  },
  {
    id: "quotation",
    label: "Cotización",
    filters: (): LeadListFilters => ({ stage: "READY_FOR_QUOTATION" }),
    permission: "quotation:manage" as const,
  },
  {
    id: "all",
    label: "Todos",
    filters: (): LeadListFilters => ({}),
    permission: "lead:view:all" as const,
  },
] as const satisfies ReadonlyArray<WorkspaceView>;

export function viewsForRole(role: string): WorkspaceView[] {
  return WORKSPACE_VIEWS.filter(
    (v) => !v.permission || hasPermission(role, v.permission),
  );
}
