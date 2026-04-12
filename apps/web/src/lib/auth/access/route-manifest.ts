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
  | "/quotations"
  | "/sales/crm"
  | "/integrations"
  | "/integrations/imports"
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
  "/leads": { landingPriority: 2 },
  "/quotations": { permission: "quotation:manage", landingPriority: 3 },
  "/sales/crm": { permission: "lead:sale:create" },
  "/integrations": { permission: "integration:manage" },
  "/integrations/imports": { permission: "integration:manage" },
  "/dashboard": { permission: "sales:review", landingPriority: 1 },
  "/audit": { permission: "audit:read", landingPriority: 8 },
  "/audit/auth": { permission: "audit:read" },
  "/audit/log": { permission: "audit:read" },
  "/schedule": {},
  "/settings/profile": {},
  "/me/capacity": { permission: "capacity:read:self" },
};

export const DYNAMIC_ROUTES: DynamicRouteConfig[] = [
  { pattern: /^\/quotations\/[^/]+$/, permission: "quotation:manage" },
  { pattern: /^\/sales\/new\/[^/]+$/, permission: "lead:sale:create" },
  { pattern: /^\/sales\/[0-9]+$/, permission: "lead:sale:create" },
  {
    pattern: /^\/integrations\/imports\/[^/]+$/,
    permission: "integration:manage",
  },
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
