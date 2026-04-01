import {
  hasPermission,
  type Permission,
  type Role,
} from "~/lib/auth/access/rbac";

export function canReadRecord(role: Role) {
  const permissions: Permission[] = [
    "lead:pipeline",
    "lead:register",
    "lead:review",
    "quotation:manage",
    "lead:reassign",
  ];

  return permissions.some((permission) => hasPermission(role, permission));
}

export function canViewAllRecords(role: Role) {
  return (
    hasPermission(role, "lead:view:all") ||
    hasPermission(role, "lead:review") ||
    hasPermission(role, "quotation:manage") ||
    hasPermission(role, "lead:reassign")
  );
}

export function canRevealFullTimeline(role: Role) {
  return role === "sales_manager" || role === "admin" || role === "superuser";
}

export function canViewAllSales(role: Role) {
  return role !== "executive";
}
