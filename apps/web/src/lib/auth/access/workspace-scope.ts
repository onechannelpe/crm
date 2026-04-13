import type { Role } from "./rbac";

export type WorkspaceScopeType = "team" | "branch" | "global";

const TEAM_SCOPED_ROLES = new Set<Role>(["executive", "supervisor"]);
const BRANCH_SCOPED_ROLES = new Set<Role>([
  "back_office",
  "sales_manager",
  "logistics",
  "hr",
  "admin",
]);

export function getWorkspaceScopeForRole(role: Role): WorkspaceScopeType {
  if (TEAM_SCOPED_ROLES.has(role)) return "team";
  if (BRANCH_SCOPED_ROLES.has(role)) return "branch";
  return "global";
}

export function requiresStrictTeamHierarchy(role: Role): boolean {
  return role === "executive";
}
