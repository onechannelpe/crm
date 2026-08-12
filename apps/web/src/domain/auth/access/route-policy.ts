import type { SessionClass } from "../core/session-contract";
import { hasPermission, type Permission, type Role } from "./rbac";
import {
  DYNAMIC_ROUTES,
  ROUTE_MANIFEST,
  type AppPath,
  type DynamicRouteConfig,
  type RouteConfig,
} from "./route-manifest";

export type { Permission, Role } from "./rbac";

const ROLE_DEFAULT_PATHS: Partial<Record<Role, AppPath>> = {
  back_office: "/records",
  supervisor: "/records",
  admin: "/records",
  superuser: "/records",
};

function isAppPath(path: string): path is AppPath {
  return path in ROUTE_MANIFEST;
}

function resolveRouteConfig(
  pathname: string,
): RouteConfig | DynamicRouteConfig | null {
  const dynamicRoute = DYNAMIC_ROUTES.find((route) =>
    route.pattern.test(pathname),
  );

  if (dynamicRoute) {
    return dynamicRoute;
  }

  if (isAppPath(pathname)) {
    return ROUTE_MANIFEST[pathname];
  }

  // Nested paths inherit the nearest configured parent route.
  const prefix = Object.keys(ROUTE_MANIFEST)
    .filter(isAppPath)
    .filter((path) => pathname.startsWith(`${path}/`))
    .toSorted((a, b) => b.length - a.length)[0];

  return prefix ? ROUTE_MANIFEST[prefix] : null;
}

export function getRoutePermission(pathname: string): Permission | null {
  return resolveRouteConfig(pathname)?.permission ?? null;
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const config = resolveRouteConfig(pathname);

  if (!config) {
    return true;
  }

  if (config.roles && !config.roles.includes(role)) {
    return false;
  }

  return !config.permission || hasPermission(role, config.permission);
}

export function getDefaultAppPath(role: Role): string {
  const roleDefault = ROLE_DEFAULT_PATHS[role];

  if (roleDefault) {
    return roleDefault;
  }

  const candidate = Object.keys(ROUTE_MANIFEST)
    .filter(isAppPath)
    .filter((path) => ROUTE_MANIFEST[path].landingPriority !== undefined)
    .toSorted(
      (a, b) =>
        (ROUTE_MANIFEST[a].landingPriority ?? 0) -
        (ROUTE_MANIFEST[b].landingPriority ?? 0),
    )
    .find((path) => canAccessPath(role, path));

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
