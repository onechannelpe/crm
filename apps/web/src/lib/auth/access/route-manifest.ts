import type { Permission } from "./rbac";

export type AppPath =
  | "/search"
  | "/settings/security"
  | "/settings/login-protection"
  | "/settings/security-policies"
  | "/settings/capacity-policies"
  | "/settings/capacity-audit"
  | "/monitoring"
  | "/settings/catalog"
  | "/team"
  | "/team/requests"
  | "/team/invite"
  | "/team/import"
  | "/inventory"
  | "/leads"
  | "/rate-simulator"
  | "/dashboard"
  | "/audit"
  | "/audit/auth"
  | "/audit/log"
  | "/schedule"
  | "/settings/profile"
  | "/me/capacity";

export interface RouteConfig {
  permission?: Permission;
  landingPriority?: number;
}

export interface DynamicRouteConfig {
  pattern: RegExp;
  permission?: Permission;
}

export const ROUTE_MANIFEST: Record<AppPath, RouteConfig> = {
  "/search": { permission: "search:use", landingPriority: 3 },
  "/settings/security": {},
  "/settings/login-protection": { permission: "admin:manage" },
  "/settings/security-policies": { permission: "admin:manage" },
  "/settings/capacity-policies": { permission: "capacity:policy:manage" },
  "/settings/capacity-audit": { permission: "capacity:policy:manage" },
  "/monitoring": { permission: "admin:read" },
  "/settings/catalog": { permission: "admin:manage" },
  "/team": { permission: "team:read", landingPriority: 6 },
  "/team/requests": { permission: "capacity:approve", landingPriority: 7 },
  "/team/invite": { permission: "team:manage" },
  "/team/import": { permission: "team:manage" },
  "/inventory": { permission: "inventory:read", landingPriority: 5 },
  "/leads": {},
  "/rate-simulator": { permission: "lead:rate:simulate", landingPriority: 4 },
  "/dashboard": { permission: "lead:work", landingPriority: 1 },
  "/audit": { permission: "audit:read", landingPriority: 8 },
  "/audit/auth": { permission: "audit:read" },
  "/audit/log": { permission: "audit:read" },
  "/schedule": {},
  "/settings/profile": {},
  "/me/capacity": { permission: "capacity:read:self" },
};

export const DYNAMIC_ROUTES: DynamicRouteConfig[] = [
  { pattern: /^\/leads\/[^/]+$/ },
  {
    pattern: /^\/team\/members\/[^/]+\/capacity$/,
    permission: "capacity:manage",
  },
];
