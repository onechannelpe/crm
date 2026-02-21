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
    label: "Opportunities",
    href: "/dashboard",
    permission: "sales:review",
    sidebarGroup: "platform",
  },
  {
    id: "team",
    label: "People",
    href: "/team",
    permission: "team:read",
    sidebarGroup: "platform",
  },
  {
    id: "inventory",
    label: "Companies",
    href: "/inventory",
    permission: "inventory:read",
    sidebarGroup: "inventory",
  },
  {
    id: "validation",
    label: "Tasks",
    href: "/validation",
    permission: "sales:review",
    sidebarGroup: "sales",
  },
  {
    id: "observability",
    label: "Notes",
    href: "/audit",
    permission: "audit:read",
    sidebarGroup: "platform",
  },
  {
    id: "quota",
    label: "Dashboards",
    href: "/quota",
    permission: "quota:allocate",
    sidebarGroup: "sales",
  },
  {
    id: "leads",
    label: "All opportunities",
    href: "/leads",
    permission: "leads:read",
    sidebarGroup: "sales",
  },
  {
    id: "client-search",
    label: "Search",
    href: "/client-search/people",
    permission: "client_search:read",
    sidebarGroup: "sales",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    permission: "admin:manage",
    sidebarGroup: "platform",
  },
];

export const DYNAMIC_ROUTE_PERMISSIONS: Array<{
  pattern: RegExp;
  permission: Permission;
}> = [
  { pattern: /^\/team\/new$/, permission: "hr:manage" },
  { pattern: /^\/sales\/new$/, permission: "sales:create" },
  { pattern: /^\/sales\/[^/]+\/fix$/, permission: "sales:submit" },
  {
    pattern: /^\/client-search\/(people|companies)$/,
    permission: "client_search:read",
  },
];
