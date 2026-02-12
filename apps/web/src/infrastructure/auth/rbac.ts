import type { User } from "~/infrastructure/db/schema";

export function canAllocateQuota(role: User["role"]): boolean {
  return ["supervisor", "sales_manager", "admin"].includes(role);
}

export function canApproveReject(role: User["role"]): boolean {
  return ["back_office", "sales_manager", "admin"].includes(role);
}

export function canRequestLeads(role: User["role"]): boolean {
  return ["executive"].includes(role);
}

export function canManageProducts(role: User["role"]): boolean {
  return ["sales_manager", "admin"].includes(role);
}

export function canViewAllSales(role: User["role"]): boolean {
  return ["sales_manager", "admin"].includes(role);
}
