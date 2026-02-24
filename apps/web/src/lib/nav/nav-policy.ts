import { canAccessPath, type Role } from "~/lib/auth/access/route-policy";

import {
  NAV_ROUTES,
  type NavRoute,
  type RouteIcon,
  type SidebarSection,
} from "./nav-config";

export type { NavRoute, RouteIcon, SidebarSection } from "./nav-config";

export interface SidebarNavRoute extends NavRoute {
  sidebar: NonNullable<NavRoute["sidebar"]>;
}

export interface SidebarChildDescriptor {
  href: string;
  label: string;
  order: number;
}

export interface HeaderDescriptor {
  label: string;
  icon: RouteIcon;
}

const HEADER_FALLBACK: HeaderDescriptor = {
  label: "Workspace",
  icon: "dashboard",
};

const DYNAMIC_ROUTE_HEADERS: Array<{
  pattern: RegExp;
  header: HeaderDescriptor;
}> = [
  {
    pattern: /^\/sales\/records\/[^/]+\/edit$/,
    header: { label: "Edit sale", icon: "new-sale" },
  },
  {
    pattern: /^\/sales\/reports\/exports\/[^/]+$/,
    header: { label: "Export detail", icon: "confirmed" },
  },
];

function isSidebarRoute(route: NavRoute): route is SidebarNavRoute {
  return route.sidebar !== undefined;
}

function sortBySidebarOrder(a: SidebarNavRoute, b: SidebarNavRoute): number {
  return a.sidebar.order - b.sidebar.order;
}

export function getSidebarRoutes(
  role: Role,
  section: SidebarSection,
): SidebarNavRoute[] {
  return NAV_ROUTES.filter((route): route is SidebarNavRoute => {
    if (!isSidebarRoute(route)) return false;
    if (route.sidebar.section !== section) return false;
    return canAccessPath(role, route.href);
  }).sort(sortBySidebarOrder);
}

export function getSidebarChildren(
  role: Role,
  parentId: string,
): SidebarChildDescriptor[] {
  const parent = NAV_ROUTES.find((r) => r.id === parentId);
  if (!parent?.sidebar?.children) return [];

  return parent.sidebar.children
    .filter((child) => canAccessPath(role, child.href))
    .sort((a, b) => a.order - b.order);
}

export function getNavigableRoutes(role: Role): NavRoute[] {
  return NAV_ROUTES.filter((route) => canAccessPath(role, route.href));
}

export function getHeaderRoute(pathname: string): HeaderDescriptor {
  for (const { pattern, header } of DYNAMIC_ROUTE_HEADERS) {
    if (pattern.test(pathname)) return header;
  }

  const exact = NAV_ROUTES.find((r) => r.href === pathname);
  if (exact?.header) return exact.header;

  const active = NAV_ROUTES.find((r) =>
    r.activePrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ),
  );
  if (active?.header) return active.header;

  const prefix = NAV_ROUTES.find((r) => pathname.startsWith(`${r.href}/`));
  if (prefix?.header) return prefix.header;

  return HEADER_FALLBACK;
}
