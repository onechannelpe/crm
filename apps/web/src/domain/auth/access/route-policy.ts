import type { SessionClass } from "../core/session-contract";
import { hasPermission, type Permission, type Role } from "./rbac";
import { DYNAMIC_ROUTES, ROUTE_MANIFEST, type AppPath } from "./route-manifest";

export type { Role, Permission } from "./rbac";
export type { AppPath } from "./route-manifest";

const ROLE_DEFAULT_PATHS: Partial<Record<Role, AppPath>> = {
  back_office: "/records",
};

function isAppPath(p: string): p is AppPath {
  return p in ROUTE_MANIFEST;
}

export function getRoutePermission(pathname: string): Permission | null {
  const dynamic = DYNAMIC_ROUTES.find((r) => r.pattern.test(pathname));
  if (dynamic) return dynamic.permission ?? null;

  if (isAppPath(pathname)) return ROUTE_MANIFEST[pathname].permission ?? null;

  // Prefix fallback: /settings/members/foo inherits /settings/members' permission.
  const prefix = Object.keys(ROUTE_MANIFEST)
    .filter(isAppPath)
    .filter((p) => pathname.startsWith(`${p}/`))
    .toSorted((a, b) => b.length - a.length)[0];

  return prefix ? (ROUTE_MANIFEST[prefix].permission ?? null) : null;
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const permission = getRoutePermission(pathname);
  if (!permission) return true;
  return hasPermission(role, permission);
}

export function getDefaultAppPath(role: Role): string {
  const roleDefault = ROLE_DEFAULT_PATHS[role];
  if (roleDefault) return roleDefault;

  const candidate = Object.keys(ROUTE_MANIFEST)
    .filter(isAppPath)
    .filter((key) => ROUTE_MANIFEST[key].landingPriority !== undefined)
    .toSorted(
      (a, b) =>
        (ROUTE_MANIFEST[a].landingPriority ?? 0) -
        (ROUTE_MANIFEST[b].landingPriority ?? 0),
    )
    .find((key) => {
      const { permission } = ROUTE_MANIFEST[key];
      return !permission || hasPermission(role, permission);
    });

  return candidate ?? "/home";
}

export function getSessionPath(sessionClass: SessionClass, role: Role): string {
  switch (sessionClass) {
    case "pre_auth":
      return "/onboarding";
    case "recovery_setup":
      return "/recovery-codes";
    case "app":
      return getDefaultAppPath(role);
    default:
      return sessionClass satisfies never;
  }
}
