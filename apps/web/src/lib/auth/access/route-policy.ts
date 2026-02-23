import { hasPermission, type Permission, type Role } from "./rbac";
import { ROUTE_PERMISSIONS, type RoutePermission } from "./route-permissions";

export type { RoutePermission } from "./route-permissions";
export type { Role, Permission } from "./rbac";

function hasHref(
  route: RoutePermission,
): route is RoutePermission & { href: string } {
  return typeof route.href === "string" && route.href.length > 0;
}

function findRoute(pathname: string): RoutePermission | undefined {
  const exact = ROUTE_PERMISSIONS.find((r) => r.href === pathname);
  if (exact) return exact;

  const dynamic = ROUTE_PERMISSIONS.find((r) => r.pattern?.test(pathname));
  if (dynamic) return dynamic;

  return ROUTE_PERMISSIONS.find((r) =>
    hasHref(r) ? pathname.startsWith(`${r.href}/`) : false,
  );
}

export function getRoutePermission(pathname: string): Permission | null {
  return findRoute(pathname)?.permission ?? null;
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const permission = getRoutePermission(pathname);
  if (!permission) return true;
  return hasPermission(role, permission);
}

export function getDefaultAppPath(role: Role): string {
  const candidate = ROUTE_PERMISSIONS.filter(
    (r): r is RoutePermission & { href: string; landingPriority: number } =>
      r.landingPriority !== undefined && hasHref(r),
  )
    .sort((a, b) => a.landingPriority - b.landingPriority)
    .find((r) => !r.permission || hasPermission(role, r.permission));

  return candidate?.href ?? "/dashboard";
}
