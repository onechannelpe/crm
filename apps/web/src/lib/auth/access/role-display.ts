import type { Role } from "./rbac";

export const ROLE_LABELS: Record<Role, string> = {
  executive: "Ejecutivo",
  supervisor: "Supervisor",
  back_office: "Validación de ventas",
  sales_manager: "Gerente de ventas",
  logistics: "Logística",
  hr: "RRHH",
  admin: "Administrador",
  superuser: "Superusuario",
};

const ASSIGNABLE_ROLE_ORDER: Role[] = [
  "executive",
  "supervisor",
  "back_office",
  "sales_manager",
  "logistics",
  "hr",
  "admin",
  "superuser",
];

export interface RoleOption {
  value: Role;
  label: string;
}

export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

export function getRoleBadgeVariant(
  role: Role,
): "default" | "warning" | "info" {
  if (role === "supervisor") return "warning";
  if (role === "admin" || role === "superuser") return "info";
  return "default";
}

export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "superuser") return targetRole !== "superuser";
  if (actorRole === "admin") return targetRole !== "superuser";
  if (actorRole === "hr") {
    return targetRole !== "admin" && targetRole !== "superuser";
  }
  return false;
}

export function getAssignableRoleOptions(actorRole: Role): RoleOption[] {
  return ASSIGNABLE_ROLE_ORDER.filter((role) =>
    canAssignRole(actorRole, role),
  ).map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  }));
}
