export const ROLES = [
  "executive",
  "supervisor",
  "back_office",
  "sales_manager",
  "logistics",
  "hr",
  "admin",
  "superuser",
] as const;

export type Role = (typeof ROLES)[number];

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
  | "team:invite"
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
  | "fulfillment:client-step"
  | "dashboards:read"
  | "dashboards:read:own"
  | "dashboards:manage"
  | "commission:read"
  | "commission:manage"
  | "data-source:import";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
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
    "dashboards:read:own",
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
    "dashboards:read",
    "dashboards:read:own",
    "dashboards:manage",
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
    "dashboards:read",
    "dashboards:read:own",
    "dashboards:manage",
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
    "team:invite",
    "inventory:read",
    "audit:read",
    "admin:read",
    "admin:manage",
    "quotation:policy:manage",
    "dashboards:read",
    "dashboards:read:own",
    "dashboards:manage",
    "commission:read",
    "commission:manage",
    "data-source:import",
  ],

  logistics: ["inventory:read", "inventory:manage"],

  hr: ["hr:read", "team:invite", "team:read"],

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
    "team:invite",
    "admin:read",
    "admin:manage",
    "audit:read",
    "dashboards:read",
    "dashboards:read:own",
    "dashboards:manage",
    "commission:read",
    "commission:manage",
    "data-source:import",
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
    "team:invite",
    "admin:read",
    "admin:manage",
    "audit:read",
    "dashboards:read",
    "dashboards:read:own",
    "dashboards:manage",
    "commission:read",
    "commission:manage",
    "data-source:import",
  ],
};

export function isRole(value: string): value is Role {
  return ROLES.some((role) => role === value);
}

export function hasPermission(role: string, permission: Permission): boolean {
  if (!isRole(role)) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getPermissions(role: string): readonly Permission[] {
  if (!isRole(role)) {
    return [];
  }

  return ROLE_PERMISSIONS[role];
}

export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "admin" || actorRole === "superuser") {
    return targetRole !== "superuser";
  }

  if (actorRole === "hr") {
    return targetRole !== "admin" && targetRole !== "superuser";
  }

  // Sales managers may staff their branch sales team.
  if (actorRole === "sales_manager") {
    return (
      targetRole === "executive" ||
      targetRole === "supervisor" ||
      targetRole === "back_office"
    );
  }

  return false;
}
