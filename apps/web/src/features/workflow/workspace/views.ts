import { type ListLeadsFiltersInput } from "~/contracts/workflow/inputs";
import { hasPermission } from "~/domain/auth/access/rbac";
import type { Permission } from "~/domain/auth/access/rbac";

export type WorkspaceView = {
  readonly id: string;
  readonly label: string;
  readonly filters: (actorUserId: string) => ListLeadsFiltersInput;
  readonly permission?: Permission;
};

const WORKSPACE_VIEWS: ReadonlyArray<WorkspaceView> = [
  {
    id: "mine",
    label: "Mis clientes",
    filters: (userId: string): ListLeadsFiltersInput => ({
      executiveId: userId,
    }),
  },
  {
    id: "review",
    label: "Revisión",
    filters: (): ListLeadsFiltersInput => ({ stage: "QUALIFYING" }),
    permission: "lead:review",
  },
  {
    id: "pricing",
    label: "Tarifa",
    filters: (): ListLeadsFiltersInput => ({ stage: "PRICING" }),
    permission: "quotation:create",
  },
  {
    id: "all",
    label: "Todos",
    filters: (): ListLeadsFiltersInput => ({}),
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
  if (configured && views.some((v) => v.id === configured)) {
    return configured;
  }
  return views[0].id;
}

export function resolveWorkspaceView(
  available: ReadonlyArray<WorkspaceView>,
  defaultViewId: string,
  viewParam: string | undefined,
): WorkspaceView {
  const match =
    available.find((v) => v.id === viewParam) ??
    available.find((v) => v.id === defaultViewId) ??
    available[0];
  if (!match) {
    throw new Error("The lead index requires at least one available view");
  }
  return match;
}
