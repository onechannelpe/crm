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
  | "lead:note:add"
  | "lead:commercial-input:complete"
  | "lead:sale:create"
  | "lead:sale:upload-proof"
  | "lead:view:all"
  | "lead:delete"
  | "lead:review"
  | "lead:reassign"
  | "quotation:create"
  | "quotation:revise"
  | "quotation:view:all"
  | "quotation:policy:manage"
  | "integration:manage"
  | "fulfillment:manage"
  // Client-facing fulfillment steps the executive performs on their own leads
  // (e.g. the refurbished transactions report); back office holds the broader
  // fulfillment:manage.
  | "fulfillment:client-step"
  // Business (Culqi GPV) dashboards: read the views, manage = upload dealer
  // reports and edit per-RUC enrichment.
  | "business-stats:read"
  | "business-stats:manage";

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
    "lead:note:add",
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
    "fulfillment:client-step",
  ],
  supervisor: [
    "lead:note:add",
    "lead:delete",
    "lead:rate:simulate",
    "lead:work",
    "lead:view:all",
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
    "business-stats:read",
    "business-stats:manage",
  ],
  back_office: [
    "lead:note:add",
    "lead:rate:simulate",
    "sales:review",
    "sales:approve",
    "audit:read",
    "lead:view:all",
    "lead:review",
    "quotation:create",
    "quotation:revise",
    "quotation:view:all",
    "integration:manage",
    "lead:sale:upload-proof",
    "fulfillment:manage",
    "business-stats:read",
    "business-stats:manage",
  ],
  sales_manager: [
    "lead:note:add",
    "lead:delete",
    "lead:rate:simulate",
    "lead:work",
    "lead:view:all",
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
    "quotation:policy:manage",
    "business-stats:read",
    "business-stats:manage",
  ],
  logistics: ["inventory:read", "inventory:manage"],
  hr: ["hr:read", "hr:manage", "team:read"],
  admin: [
    "lead:note:add",
    "lead:delete",
    "lead:rate:simulate",
    "lead:work",
    "sales:review",
    "search:use",
    "lead:commercial-input:complete",
    "lead:sale:create",
    "lead:sale:upload-proof",
    "lead:view:all",
    "lead:review",
    "lead:reassign",
    "quotation:create",
    "quotation:revise",
    "quotation:view:all",
    "quotation:policy:manage",
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
    "business-stats:read",
    "business-stats:manage",
  ],
  superuser: [
    "lead:note:add",
    "lead:delete",
    "lead:rate:simulate",
    "lead:work",
    "sales:create",
    "sales:submit",
    "sales:review",
    "sales:approve",
    "lead:commercial-input:complete",
    "lead:sale:create",
    "lead:sale:upload-proof",
    "lead:view:all",
    "lead:review",
    "lead:reassign",
    "quotation:create",
    "quotation:revise",
    "quotation:view:all",
    "quotation:policy:manage",
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
    "business-stats:read",
    "business-stats:manage",
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
