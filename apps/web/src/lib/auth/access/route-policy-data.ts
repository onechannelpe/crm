import type { Permission } from "./rbac";

export type SidebarGroup = "platform" | "sales" | "inventory";

export interface StaticRoute {
  id: string;
  label: string;
  href: string;
  permission?: Permission;
  sidebarGroup?: SidebarGroup;
}

export const STATIC_ROUTES: StaticRoute[] = [
  {
    id: "dashboard",
    label: "Inicio",
    href: "/dashboard",
    sidebarGroup: "platform",
  },
  {
    id: "team",
    label: "Equipo",
    href: "/team",
    permission: "team:read",
    sidebarGroup: "platform",
  },
  {
    id: "settings",
    label: "Configuración",
    href: "/settings",
    permission: "admin:manage",
    sidebarGroup: "platform",
  },
  {
    id: "leads",
    label: "Leads",
    href: "/leads",
    permission: "leads:read",
    sidebarGroup: "sales",
  },
  {
    id: "quota",
    label: "Cuota",
    href: "/quota",
    permission: "quota:read",
    sidebarGroup: "sales",
  },
  {
    id: "validation",
    label: "Validación",
    href: "/validation",
    permission: "sales:review",
    sidebarGroup: "sales",
  },
  {
    id: "inventory",
    label: "Inventario",
    href: "/inventory",
    permission: "inventory:read",
    sidebarGroup: "inventory",
  },
];

export const DYNAMIC_ROUTE_PERMISSIONS: Array<{
  pattern: RegExp;
  permission: Permission;
}> = [
  { pattern: /^\/sales\/new$/, permission: "sales:create" },
  { pattern: /^\/sales\/[^/]+\/fix$/, permission: "sales:submit" },
];
