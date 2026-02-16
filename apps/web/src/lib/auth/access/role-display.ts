import type { Role } from "./rbac";

export const ROLE_LABELS: Record<Role, string> = {
  executive: "Ejecutivo",
  supervisor: "Supervisor",
  back_office: "Validación",
  sales_manager: "Gerente de Ventas",
  logistics: "Logística",
  hr: "RRHH",
  admin: "Administrador",
  superuser: "Superusuario",
};

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
