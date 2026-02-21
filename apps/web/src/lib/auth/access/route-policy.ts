import { hasPermission, type Permission, type Role } from "./rbac";
import {
  APP_ROUTES,
  type AppRoute,
  type HeaderMeta,
  type SidebarSection,
} from "./route-policy-data";

export type { AppRoute, RouteIcon, SidebarSection } from "./route-policy-data";

export interface HeaderRouteDescriptor {
  label: string;
  icon: AppRoute["icon"];
}

export interface SidebarChildDescriptor {
  route: SidebarRoute;
  label: string;
  order: number;
}

export interface SidebarRoute extends AppRoute {
  href: string;
  sidebar: NonNullable<AppRoute["sidebar"]>;
}

const HEADER_FALLBACK: HeaderRouteDescriptor = {
  label: "Workspace",
  icon: "opportunities",
};

function hasRouteAccess(role: Role, route: AppRoute): boolean {
  if (!route.permission) return true;
  return hasPermission(role, route.permission);
}

function hasHref(route: AppRoute): route is AppRoute & { href: string } {
  return typeof route.href === "string" && route.href.length > 0;
}

function isSidebarRoute(route: AppRoute): route is SidebarRoute {
  return Boolean(route.sidebar) && hasHref(route);
}

function sortByLandingPriority(a: AppRoute, b: AppRoute): number {
  const aPriority = a.landingPriority ?? Number.MAX_SAFE_INTEGER;
  const bPriority = b.landingPriority ?? Number.MAX_SAFE_INTEGER;
  return aPriority - bPriority;
}

function sortBySidebarOrder(a: SidebarRoute, b: SidebarRoute): number {
  return a.sidebar.order - b.sidebar.order;
}

function findRouteById(routeId: string): AppRoute | undefined {
  return APP_ROUTES.find((route) => route.id === routeId);
}

function findRouteForPermission(pathname: string): AppRoute | undefined {
  const exact = APP_ROUTES.find((route) => route.href === pathname);
  if (exact) return exact;

  const dynamic = APP_ROUTES.find((route) => route.pattern?.test(pathname));
  if (dynamic) return dynamic;

  return APP_ROUTES.find((route) =>
    hasHref(route) ? pathname.startsWith(`${route.href}/`) : false,
  );
}

function findRouteForHeader(pathname: string): AppRoute | undefined {
  const exact = APP_ROUTES.find((route) => route.href === pathname);
  if (exact) return exact;

  const dynamic = APP_ROUTES.find((route) => route.pattern?.test(pathname));
  if (dynamic) return dynamic;

  const active = APP_ROUTES.find((route) =>
    route.activePrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ),
  );
  if (active) return active;

  return APP_ROUTES.find((route) =>
    hasHref(route) ? pathname.startsWith(`${route.href}/`) : false,
  );
}

function toHeaderDescriptor(route: AppRoute): HeaderRouteDescriptor {
  const header: HeaderMeta | undefined = route.header;
  if (header) {
    return {
      label: header.label,
      icon: header.icon,
    };
  }

  return {
    label: route.navLabel ?? route.label,
    icon: route.icon,
  };
}

export function getRoutePermission(pathname: string): Permission | null {
  const route = findRouteForPermission(pathname);
  return route?.permission ?? null;
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const permission = getRoutePermission(pathname);
  if (!permission) return true;
  return hasPermission(role, permission);
}

export function getDefaultAppPath(role: Role): string {
  const candidate = APP_ROUTES.filter(
    (route): route is AppRoute & { href: string } =>
      route.landingPriority !== undefined && hasHref(route),
  )
    .sort(sortByLandingPriority)
    .find((route) => hasRouteAccess(role, route));

  return candidate?.href ?? "/dashboard";
}

export function getSidebarRoutes(role: Role, section: SidebarSection): SidebarRoute[] {
  return APP_ROUTES.filter((route): route is SidebarRoute => {
    if (!isSidebarRoute(route)) return false;
    if (route.sidebar.section !== section) return false;
    return hasRouteAccess(role, route);
  }).sort(sortBySidebarOrder);
}

export function getSidebarChildren(
  role: Role,
  parentRouteId: string,
): SidebarChildDescriptor[] {
  const parent = findRouteById(parentRouteId);
  if (!parent?.sidebar?.children || parent.sidebar.children.length === 0) {
    return [];
  }

  return parent.sidebar.children
    .map((child) => {
      const route = findRouteById(child.routeId);
      if (!route || !isSidebarRoute(route) || !hasRouteAccess(role, route)) {
        return null;
      }

      return {
        route,
        label: child.label,
        order: child.order,
      };
    })
    .filter((entry): entry is SidebarChildDescriptor => entry !== null)
    .sort((a, b) => a.order - b.order);
}

export function getHeaderRoute(pathname: string): HeaderRouteDescriptor {
  const route = findRouteForHeader(pathname);
  if (!route) return HEADER_FALLBACK;
  return toHeaderDescriptor(route);
}

export function isKnownProtectedRoute(pathname: string): boolean {
  const route = findRouteForPermission(pathname);
  return route !== undefined;
}
