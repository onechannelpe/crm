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
    id: "settings",
    href: "/settings",
    permission: "admin:manage",
    landingPriority: 9,
  },
  { id: "team", href: "/team", permission: "team:read", landingPriority: 6 },
  { id: "team-new", href: "/team/new", permission: "hr:manage" },
  {
    id: "inventory",
    href: "/inventory",
    permission: "inventory:read",
    landingPriority: 5,
  },
  { id: "leads", href: "/leads", permission: "leads:read", landingPriority: 2 },
  {
    id: "dashboard",
    href: "/dashboard",
    permission: "sales:review",
    landingPriority: 1,
  },
  { id: "sales-new", href: "/sales/new", permission: "sales:create" },
  { id: "sales-approved", href: "/sales/approved", permission: "sales:review" },
  {
    id: "sales-fix",
    pattern: /^\/sales\/[^/]+\/fix$/,
    permission: "sales:submit",
  },
  {
    id: "review",
    href: "/review",
    permission: "sales:review",
    landingPriority: 4,
  },
  { id: "audit", href: "/audit", permission: "audit:read", landingPriority: 8 },
  {
    id: "quota",
    href: "/quota",
    permission: "quota:allocate",
    landingPriority: 7,
  },
  { id: "profile", href: "/profile" },
];
