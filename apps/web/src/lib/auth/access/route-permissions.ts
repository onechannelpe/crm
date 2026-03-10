import type { Permission } from "./rbac";

export interface RoutePermission {
  id: string;
  href?: string;
  pattern?: RegExp;
  permission?: Permission;
  landingPriority?: number;
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  {
    id: "contacts-people",
    href: "/contacts/people",
    permission: "client_search:read",
    landingPriority: 3,
  },
  {
    id: "contacts-companies",
    href: "/contacts/companies",
    permission: "client_search:read",
  },
  {
    id: "settings-general",
    href: "/settings/general",
    permission: "admin:manage",
  },
  {
    id: "settings-security",
    href: "/settings/security",
  },
  {
    id: "settings-login-protection",
    href: "/settings/login-protection",
    permission: "admin:manage",
  },
  {
    id: "settings-security-policies",
    href: "/settings/security-policies",
    permission: "admin:manage",
  },
  { id: "catalog", href: "/catalog", permission: "admin:manage" },
  { id: "team", href: "/team", permission: "team:read", landingPriority: 6 },
  { id: "team-invite", href: "/team/invite", permission: "team:manage" },
  {
    id: "inventory",
    href: "/inventory",
    permission: "inventory:read",
    landingPriority: 5,
  },
  {
    id: "sales-leads",
    href: "/sales/leads",
    permission: "leads:read",
    landingPriority: 2,
  },
  {
    id: "dashboard",
    href: "/dashboard",
    permission: "sales:review",
    landingPriority: 1,
  },
  {
    id: "sales-records-new",
    href: "/sales/records/new",
    permission: "sales:create",
  },
  {
    id: "sales-confirmed",
    href: "/sales/confirmed",
    permission: "sales:review",
  },
  {
    id: "sales-records-edit",
    pattern: /^\/sales\/records\/[^/]+\/edit$/,
    permission: "sales:create",
  },
  {
    id: "sales-confirmations",
    href: "/sales/confirmations",
    permission: "sales:review",
    landingPriority: 4,
  },
  {
    id: "sales-reports-exports",
    href: "/sales/reports/exports",
    permission: "sales:review",
  },
  {
    id: "sales-reports-export-detail",
    pattern: /^\/sales\/reports\/exports\/[^/]+$/,
    permission: "sales:review",
  },
  { id: "audit", href: "/audit", permission: "audit:read", landingPriority: 8 },
  {
    id: "audit-observability",
    href: "/audit/observability",
    permission: "audit:read",
  },
  { id: "audit-auth", href: "/audit/auth", permission: "audit:read" },
  { id: "audit-log", href: "/audit/log", permission: "audit:read" },
  {
    id: "quota",
    href: "/quota",
    permission: "quota:allocate",
    landingPriority: 7,
  },
  { id: "schedule", href: "/schedule" },
  { id: "profile", href: "/settings/profile" },
];
