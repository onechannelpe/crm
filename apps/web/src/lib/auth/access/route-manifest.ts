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
  | "/review"
  | "/quotations"
  | "/sales/crm"
  | "/integrations"
  | "/integrations/imports"
  | "/integrations/exports"
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
  "/leads": { permission: "lead:pipeline", landingPriority: 2 },
  "/review": { permission: "lead:review", landingPriority: 4 },
  "/quotations": { permission: "quotation:manage", landingPriority: 3 },
  "/sales/crm": { permission: "lead:register" },
  "/integrations": { permission: "integration:manage" },
  "/integrations/imports": { permission: "integration:manage" },
  "/integrations/exports": { permission: "integration:manage" },
  "/dashboard": { permission: "sales:review", landingPriority: 1 },
  "/audit": { permission: "audit:read", landingPriority: 8 },
  "/audit/auth": { permission: "audit:read" },
  "/audit/log": { permission: "audit:read" },
  "/schedule": {},
  "/settings/profile": {},
  "/me/capacity": { permission: "capacity:read:self" },
};

export const DYNAMIC_ROUTES: DynamicRouteConfig[] = [
  { pattern: /^\/leads\/[^/]+$/, permission: "lead:pipeline" },
  { pattern: /^\/leads\/[^/]+\/complete$/, permission: "lead:pipeline" },
  { pattern: /^\/review\/[^/]+$/, permission: "lead:review" },
  { pattern: /^\/quotations\/[^/]+$/, permission: "quotation:manage" },
  { pattern: /^\/sales\/new\/[^/]+$/, permission: "lead:register" },
  { pattern: /^\/sales\/[0-9]+$/, permission: "lead:register" },
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
