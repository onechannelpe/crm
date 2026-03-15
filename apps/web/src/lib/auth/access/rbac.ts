export type Role =
  | "executive"
  | "supervisor"
  | "back_office"
  | "sales_manager"
  | "logistics"
  | "hr"
  | "admin"
  | "superuser";

export type Permission =
  | "leads:read"
  | "leads:request"
  | "sales:create"
  | "sales:submit"
  | "sales:review"
  | "sales:approve"
  | "client_search:read"
  | "team:read"
  | "team:manage"
  | "inventory:read"
  | "inventory:manage"
  | "hr:read"
  | "hr:manage"
  | "admin:read"
  | "admin:manage"
  | "audit:read";

export const ROLES = [
  "executive",
  "supervisor",
  "back_office",
  "sales_manager",
  "logistics",
  "hr",
  "admin",
  "superuser",
] as const satisfies ReadonlyArray<Role>;

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  executive: [
    "leads:read",
    "leads:request",
    "sales:create",
    "sales:submit",
    "client_search:read",
  ],
  supervisor: [
    "leads:read",
    "leads:request",
    "sales:create",
    "sales:submit",
    "sales:review",
    "sales:approve",
    "client_search:read",
    "team:read",
    "team:manage",
    "audit:read",
  ],
  back_office: ["sales:review", "sales:approve", "audit:read"],
  sales_manager: [
    "leads:read",
    "sales:review",
    "sales:approve",
    "team:read",
    "team:manage",
    "inventory:read",
    "client_search:read",
    "audit:read",
    "admin:read",
    "admin:manage",
  ],
  logistics: ["inventory:read", "inventory:manage"],
  hr: ["hr:read", "hr:manage", "team:read"],
  admin: [
    "leads:read",
    "sales:review",
    "team:read",
    "team:manage",
    "inventory:read",
    "inventory:manage",
    "client_search:read",
    "hr:read",
    "hr:manage",
    "admin:read",
    "admin:manage",
    "audit:read",
  ],
  superuser: [
    "leads:read",
    "leads:request",
    "sales:create",
    "sales:submit",
    "sales:review",
    "sales:approve",
    "client_search:read",
    "team:read",
    "team:manage",
    "inventory:read",
    "inventory:manage",
    "hr:read",
    "hr:manage",
    "admin:read",
    "admin:manage",
    "audit:read",
  ],
};

export function isRole(value: string): value is Role {
  return ROLES.some((role) => role === value);
}

export function hasPermission(role: string, permission: Permission): boolean {
  if (!isRole(role)) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function getPermissions(role: string): Permission[] {
  if (!isRole(role)) return [];
  return ROLE_PERMISSIONS[role] ?? [];
}

export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "superuser") return targetRole !== "superuser";
  if (actorRole === "admin") return targetRole !== "superuser";
  if (actorRole === "hr") {
    return targetRole !== "admin" && targetRole !== "superuser";
  }
  return false;
}
