import { hasPermission, type Permission, type Role } from "./rbac";
import {
  DYNAMIC_ROUTE_PERMISSIONS,
  STATIC_ROUTES,
  type SidebarGroup,
  type StaticRoute,
} from "./route-policy-data";

export function getRoutePermission(pathname: string): Permission | null {
  const staticRoute = STATIC_ROUTES.find((route) => route.href === pathname);
  if (staticRoute) return staticRoute.permission ?? null;
  const dynamicRoute = DYNAMIC_ROUTE_PERMISSIONS.find((route) =>
    route.pattern.test(pathname),
  );
  if (!dynamicRoute) return null;
  return dynamicRoute.permission;
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const permission = getRoutePermission(pathname);
  if (!permission) return true;
  return hasPermission(role, permission);
}

export function getSearchRoutes(role?: Role): StaticRoute[] {
  return STATIC_ROUTES.filter((route) => {
    if (!route.permission) return true;
    if (!role) return false;
    return hasPermission(role, route.permission);
  });
}

export function getSidebarRoutes(
  role: Role,
  group: SidebarGroup,
): StaticRoute[] {
  return STATIC_ROUTES.filter((route) => {
    if (route.sidebarGroup !== group) return false;
    if (!route.permission) return true;
    return hasPermission(role, route.permission);
  });
}
