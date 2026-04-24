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
  | "lead:rate:simulate"
  | "lead:work"
  | "lead:workflow"
  | "sales:create"
  | "sales:submit"
  | "sales:review"
  | "sales:approve"
  | "search:use"
  | "capacity:read:self"
  | "capacity:request:self"
  | "capacity:read:team"
  | "capacity:manage"
  | "capacity:approve"
  | "capacity:policy:manage"
  | "capacity:audit:read"
  | "team:read"
  | "team:manage"
  | "inventory:read"
  | "inventory:manage"
  | "hr:read"
  | "hr:manage"
  | "admin:read"
  | "admin:manage"
  | "audit:read"
  | "lead:register"
  | "lead:commercial-input:complete"
  | "lead:sale:create"
  | "lead:sale:upload-proof"
  | "lead:view:all"
  | "lead:review"
  | "lead:reassign"
  | "quotation:manage"
  | "integration:manage"
  | "file:artifact:request"
  | "file:artifact:upload"
  | "file:artifact:read"
  | "file:artifact:audit:read";

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
    "lead:rate:simulate",
    "lead:work",
    "lead:workflow",
    "sales:create",
    "sales:submit",
    "search:use",
    "capacity:read:self",
    "capacity:request:self",
    "lead:register",
    "lead:commercial-input:complete",
    "lead:sale:create",
    "lead:sale:upload-proof",
  ],
  supervisor: [
    "lead:rate:simulate",
    "lead:work",
    "sales:create",
    "sales:submit",
    "sales:review",
    "sales:approve",
    "lead:sale:upload-proof",
    "search:use",
    "capacity:read:self",
    "capacity:request:self",
    "capacity:read:team",
    "capacity:manage",
    "capacity:approve",
    "team:read",
    "team:manage",
    "audit:read",
    "file:artifact:read",
    "file:artifact:audit:read",
  ],
  back_office: [
    "lead:rate:simulate",
    "sales:review",
    "sales:approve",
    "audit:read",
    "lead:view:all",
    "lead:review",
    "quotation:manage",
    "integration:manage",
    "file:artifact:request",
    "file:artifact:upload",
    "file:artifact:read",
    "lead:sale:upload-proof",
  ],
  sales_manager: [
    "lead:rate:simulate",
    "lead:work",
    "sales:review",
    "sales:approve",
    "lead:sale:upload-proof",
    "search:use",
    "capacity:read:self",
    "capacity:request:self",
    "capacity:read:team",
    "capacity:manage",
    "capacity:approve",
    "capacity:policy:manage",
    "capacity:audit:read",
    "team:read",
    "team:manage",
    "inventory:read",
    "audit:read",
    "admin:read",
    "admin:manage",
    "file:artifact:read",
    "file:artifact:audit:read",
  ],
  logistics: ["inventory:read", "inventory:manage"],
  hr: ["hr:read", "hr:manage", "team:read"],
  admin: [
    "lead:rate:simulate",
    "lead:work",
    "sales:review",
    "search:use",
    "lead:register",
    "lead:commercial-input:complete",
    "lead:sale:create",
    "lead:sale:upload-proof",
    "lead:view:all",
    "lead:review",
    "lead:reassign",
    "quotation:manage",
    "integration:manage",
    "capacity:read:self",
    "capacity:request:self",
    "capacity:read:team",
    "capacity:manage",
    "capacity:approve",
    "capacity:policy:manage",
    "capacity:audit:read",
    "team:read",
    "team:manage",
    "inventory:read",
    "inventory:manage",
    "hr:read",
    "hr:manage",
    "admin:read",
    "admin:manage",
    "audit:read",
    "file:artifact:request",
    "file:artifact:upload",
    "file:artifact:read",
    "file:artifact:audit:read",
  ],
  superuser: [
    "lead:rate:simulate",
    "lead:work",
    "sales:create",
    "sales:submit",
    "sales:review",
    "sales:approve",
    "lead:register",
    "lead:commercial-input:complete",
    "lead:sale:create",
    "lead:sale:upload-proof",
    "lead:view:all",
    "lead:review",
    "lead:reassign",
    "quotation:manage",
    "integration:manage",
    "search:use",
    "capacity:read:self",
    "capacity:request:self",
    "capacity:read:team",
    "capacity:manage",
    "capacity:approve",
    "capacity:policy:manage",
    "capacity:audit:read",
    "team:read",
    "team:manage",
    "inventory:read",
    "inventory:manage",
    "hr:read",
    "hr:manage",
    "admin:read",
    "admin:manage",
    "audit:read",
    "file:artifact:request",
    "file:artifact:upload",
    "file:artifact:read",
    "file:artifact:audit:read",
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
