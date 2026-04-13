import { hasPermission, type Permission, type Role } from "./rbac";
import { DYNAMIC_ROUTES, ROUTE_MANIFEST, type AppPath } from "./route-manifest";

export type { Role, Permission } from "./rbac";
export type { AppPath } from "./route-manifest";

const ROLE_DEFAULT_PATHS: Partial<Record<Role, AppPath>> = {
  executive: "/leads",
  back_office: "/leads",
};

function isAppPath(p: string): p is AppPath {
  return p in ROUTE_MANIFEST;
}

function resolvePermission(pathname: string): Permission | null {
  const dynamic = DYNAMIC_ROUTES.find((r) => r.pattern.test(pathname));
  if (dynamic) return dynamic.permission ?? null;

  if (isAppPath(pathname)) return ROUTE_MANIFEST[pathname].permission ?? null;

  // Prefix fallback: /team/invite/foo inherits /team/invite's permission.
  const prefix = Object.keys(ROUTE_MANIFEST)
    .filter(isAppPath)
    .filter((p) => pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];

  return prefix ? (ROUTE_MANIFEST[prefix].permission ?? null) : null;
}

export function getRoutePermission(pathname: string): Permission | null {
  return resolvePermission(pathname);
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const permission = resolvePermission(pathname);
  if (!permission) return true;
  return hasPermission(role, permission);
}

export function getDefaultAppPath(role: Role): string {
  const roleDefault = ROLE_DEFAULT_PATHS[role];
  if (roleDefault) return roleDefault;

  const candidate = Object.keys(ROUTE_MANIFEST)
    .filter(isAppPath)
    .filter((key) => ROUTE_MANIFEST[key].landingPriority !== undefined)
    .sort(
      (a, b) =>
        (ROUTE_MANIFEST[a].landingPriority ?? 0) -
        (ROUTE_MANIFEST[b].landingPriority ?? 0),
    )
    .find((key) => {
      const { permission } = ROUTE_MANIFEST[key];
      return !permission || hasPermission(role, permission);
    });

  return candidate ?? "/dashboard";
}
