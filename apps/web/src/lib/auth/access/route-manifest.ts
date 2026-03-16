import type { Permission } from "./rbac";

export type AppPath =
  | "/contacts/people"
  | "/contacts/companies"
  | "/settings/security"
  | "/settings/login-protection"
  | "/settings/security-policies"
  | "/monitoring"
  | "/settings/catalog"
  | "/team"
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
  | "/quota"
  | "/schedule"
  | "/settings/profile";

export interface RouteConfig {
  permission?: Permission;
  landingPriority?: number;
}

export interface DynamicRouteConfig {
  pattern: RegExp;
  permission?: Permission;
}

export const ROUTE_MANIFEST: Record<AppPath, RouteConfig> = {
  "/contacts/people": { permission: "client_search:read", landingPriority: 3 },
  "/contacts/companies": { permission: "client_search:read" },
  "/settings/security": {},
  "/settings/login-protection": { permission: "admin:manage" },
  "/settings/security-policies": { permission: "admin:manage" },
  "/monitoring": { permission: "admin:read" },
  "/settings/catalog": { permission: "admin:manage" },
  "/team": { permission: "team:read", landingPriority: 6 },
  "/team/invite": { permission: "team:manage" },
  "/team/import": { permission: "team:manage" },
  "/inventory": { permission: "inventory:read", landingPriority: 5 },
  "/sales/leads": { permission: "leads:read", landingPriority: 2 },
  "/dashboard": { permission: "sales:review", landingPriority: 1 },
  "/sales/records/new": { permission: "sales:create" },
  "/sales/confirmed": { permission: "sales:review" },
  "/sales/confirmations": { permission: "sales:review", landingPriority: 4 },
  "/sales/reports/exports": { permission: "sales:review" },
  "/audit": { permission: "audit:read", landingPriority: 8 },
  "/audit/auth": { permission: "audit:read" },
  "/audit/log": { permission: "audit:read" },
  "/quota": { permission: "quota:allocate", landingPriority: 7 },
  "/schedule": {},
  "/settings/profile": {},
};

export const DYNAMIC_ROUTES: DynamicRouteConfig[] = [
  { pattern: /^\/sales\/records\/[^/]+\/edit$/, permission: "sales:create" },
  {
    pattern: /^\/sales\/reports\/exports\/[^/]+$/,
    permission: "sales:review",
  },
];
