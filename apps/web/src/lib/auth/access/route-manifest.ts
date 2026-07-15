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
  | "/settings/members"
  | "/team"
  | "/team/requests"
  | "/inventory"
  | "/records"
  | "/fulfillment"
  | "/rate-simulator"
  | "/dashboard"
  | "/dashboards"
  | "/schedule"
  | "/settings/profile"
  | "/settings/appearance"
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
  "/settings/members": { permission: "team:read" },
  "/team": { permission: "team:read", landingPriority: 6 },
  "/team/requests": { permission: "capacity:approve", landingPriority: 7 },
  "/inventory": { permission: "inventory:read", landingPriority: 5 },
  "/records": {},
  "/fulfillment": { permission: "fulfillment:manage" },
  "/rate-simulator": { permission: "lead:rate:simulate", landingPriority: 4 },
  "/dashboard": { permission: "lead:work", landingPriority: 1 },
  "/dashboards": { permission: "dashboards:read" },
  "/schedule": {},
  "/settings/profile": {},
  "/settings/appearance": {},
  "/settings/notifications": {},
  "/me/capacity": { permission: "capacity:read:self" },
};

export const DYNAMIC_ROUTES: DynamicRouteConfig[] = [
  { pattern: /^\/records\/[^/]+$/ },
  // Gated tighter than the panel below: a queue is for the people who can
  // resolve a row, not everyone who can read the counters.
  {
    pattern: /^\/dashboards\/calidad\/[^/]+$/,
    permission: "dashboards:manage",
  },
  { pattern: /^\/dashboards\/[^/]+$/, permission: "dashboards:read" },
  {
    pattern: /^\/settings\/members\/[^/]+$/,
    permission: "team:read",
  },
];
