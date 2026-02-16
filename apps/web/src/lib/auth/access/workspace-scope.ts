import type { Role } from "./rbac";

export type WorkspaceScopeType = "team" | "branch" | "global";

const TEAM_SCOPED_ROLES: Role[] = ["executive", "supervisor"];
const BRANCH_SCOPED_ROLES: Role[] = [
  "back_office",
  "sales_manager",
  "logistics",
  "hr",
  "admin",
];

export function getWorkspaceScopeForRole(role: Role): WorkspaceScopeType {
  if (TEAM_SCOPED_ROLES.includes(role)) return "team";
  if (BRANCH_SCOPED_ROLES.includes(role)) return "branch";
  return "global";
}

export function requiresStrictTeamHierarchy(role: Role): boolean {
  return role === "executive";
}
