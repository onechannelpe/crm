import type { Permission } from "./rbac";

export type AppPath =
  | "/search"
  | "/settings/security"
  | "/settings/login-protection"
  | "/settings/security-policies"
  | "/settings/capacity-policies"
  | "/settings/quotation-policies"
  | "/settings/event-logs"
  | "/monitoring"
  | "/settings/catalog"
  | "/settings/members"
  | "/team"
  | "/team/requests"
  | "/inventory"
  | "/records"
  | "/fulfillment"
  | "/rate-simulator"
  | "/dashboard"
  | "/schedule"
  | "/settings/profile"
  | "/settings/notifications"
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
  "/settings/quotation-policies": { permission: "quotation:policy:manage" },
  "/settings/event-logs": { permission: "audit:read" },
  "/monitoring": { permission: "admin:read" },
  "/settings/catalog": { permission: "admin:manage" },
  "/settings/members": { permission: "team:read" },
  "/team": { permission: "team:read", landingPriority: 6 },
  "/team/requests": { permission: "capacity:approve", landingPriority: 7 },
  "/inventory": { permission: "inventory:read", landingPriority: 5 },
  "/records": {},
  "/fulfillment": { permission: "fulfillment:manage" },
  "/rate-simulator": { permission: "lead:rate:simulate", landingPriority: 4 },
  "/dashboard": { permission: "lead:work", landingPriority: 1 },
  "/schedule": {},
  "/settings/profile": {},
  "/settings/notifications": {},
  "/me/capacity": { permission: "capacity:read:self" },
};

export const DYNAMIC_ROUTES: DynamicRouteConfig[] = [
  { pattern: /^\/records\/[^/]+$/ },
  {
    pattern: /^\/settings\/members\/[^/]+$/,
    permission: "team:read",
  },
];
