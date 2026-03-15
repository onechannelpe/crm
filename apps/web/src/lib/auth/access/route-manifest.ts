import type { Permission } from "./rbac";

export type AppPath =
  | "/search"
  | "/settings/security"
  | "/settings/login-protection"
  | "/settings/security-policies"
  | "/admin/capacity-policies"
  | "/monitoring"
  | "/settings/catalog"
  | "/team"
  | "/team/requests"
  | "/team/invite"
  | "/team/import"
  | "/inventory"
  | "/sales/leads"
  | "/dashboard"
  | "/sales/records/new"
  | "/sales/confirmed"
  | "/sales/confirmations"
  | "/sales/reports/exports"
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
  "/admin/capacity-policies": { permission: "capacity:policy:manage" },
  "/monitoring": { permission: "admin:read" },
  "/settings/catalog": { permission: "admin:manage" },
  "/team": { permission: "capacity:read:team", landingPriority: 6 },
  "/team/requests": { permission: "capacity:approve", landingPriority: 7 },
  "/team/invite": { permission: "team:manage" },
  "/team/import": { permission: "team:manage" },
  "/inventory": { permission: "inventory:read", landingPriority: 5 },
  "/sales/leads": { permission: "lead:work", landingPriority: 2 },
  "/dashboard": { permission: "sales:review", landingPriority: 1 },
  "/sales/records/new": { permission: "sales:create" },
  "/sales/confirmed": { permission: "sales:review" },
  "/sales/confirmations": { permission: "sales:review", landingPriority: 4 },
  "/sales/reports/exports": { permission: "sales:review" },
  "/audit": { permission: "audit:read", landingPriority: 8 },
  "/audit/auth": { permission: "audit:read" },
  "/audit/log": { permission: "audit:read" },
  "/schedule": {},
  "/settings/profile": {},
  "/me/capacity": { permission: "capacity:read:self" },
};

export const DYNAMIC_ROUTES: DynamicRouteConfig[] = [
  { pattern: /^\/sales\/records\/[^/]+\/edit$/, permission: "sales:create" },
  {
    pattern: /^\/team\/members\/[^/]+\/capacity$/,
    permission: "capacity:manage",
  },
  {
    pattern: /^\/sales\/reports\/exports\/[^/]+$/,
    permission: "sales:review",
  },
];
