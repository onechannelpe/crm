import type { Permission } from "./rbac";

export type SidebarSection = "quick" | "workspace";

export type RouteIcon =
  | "search"
  | "settings"
  | "people"
  | "companies"
  | "opportunities"
  | "tasks"
  | "notes"
  | "dashboards"
  | "profile"
  | "workflows";

export interface SidebarChildLink {
  routeId: string;
  label: string;
  order: number;
}

export interface SidebarMeta {
  section: SidebarSection;
  order: number;
  itemLabel?: string;
  children?: SidebarChildLink[];
}

export interface HeaderMeta {
  label: string;
  icon: RouteIcon;
}

export interface AppRoute {
  id: string;
  label: string;
  href?: string;
  pattern?: RegExp;
  permission?: Permission;
  icon: RouteIcon;
  navLabel?: string;
  header?: HeaderMeta;
  landingPriority?: number;
  sidebar?: SidebarMeta;
  activePrefixes?: string[];
}

export const APP_ROUTES: AppRoute[] = [
  {
    id: "client-search-people",
    label: "People",
    href: "/client-search/people",
    permission: "client_search:read",
    icon: "search",
    navLabel: "Search",
    header: { label: "People", icon: "people" },
    landingPriority: 3,
    sidebar: {
      section: "quick",
      order: 1,
      itemLabel: "Search",
      children: [
        { routeId: "client-search-people", label: "People", order: 1 },
        { routeId: "client-search-companies", label: "Companies", order: 2 },
      ],
    },
    activePrefixes: ["/client-search/people", "/client-search/companies"],
  },
  {
    id: "client-search-companies",
    label: "Companies",
    href: "/client-search/companies",
    permission: "client_search:read",
    icon: "companies",
    header: { label: "Companies", icon: "companies" },
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    permission: "admin:manage",
    icon: "settings",
    navLabel: "Settings",
    header: { label: "Settings", icon: "settings" },
    sidebar: { section: "quick", order: 2 },
    landingPriority: 9,
  },
  {
    id: "team",
    label: "People",
    href: "/team",
    permission: "team:read",
    icon: "people",
    navLabel: "People",
    header: { label: "People", icon: "people" },
    sidebar: { section: "workspace", order: 1 },
    landingPriority: 6,
  },
  {
    id: "team-new",
    label: "People",
    href: "/team/new",
    permission: "hr:manage",
    icon: "people",
    header: { label: "People", icon: "people" },
  },
  {
    id: "inventory",
    label: "Companies",
    href: "/inventory",
    permission: "inventory:read",
    icon: "companies",
    navLabel: "Companies",
    header: { label: "Companies", icon: "companies" },
    sidebar: { section: "workspace", order: 2 },
    landingPriority: 5,
  },
  {
    id: "leads",
    label: "All opportunities",
    href: "/leads",
    permission: "leads:read",
    icon: "opportunities",
    navLabel: "Opportunities",
    header: { label: "Opportunities", icon: "opportunities" },
    sidebar: {
      section: "workspace",
      order: 3,
      itemLabel: "Opportunities",
      children: [
        { routeId: "leads", label: "All opportunities", order: 1 },
        { routeId: "dashboard", label: "By stage", order: 2 },
      ],
    },
    landingPriority: 2,
    activePrefixes: ["/leads", "/dashboard"],
  },
  {
    id: "dashboard",
    label: "By stage",
    href: "/dashboard",
    permission: "sales:review",
    icon: "opportunities",
    header: { label: "Opportunities", icon: "opportunities" },
    landingPriority: 1,
  },
  {
    id: "validation",
    label: "Tasks",
    href: "/validation",
    permission: "sales:review",
    icon: "tasks",
    navLabel: "Tasks",
    header: { label: "Tasks", icon: "tasks" },
    sidebar: { section: "workspace", order: 4 },
    landingPriority: 4,
  },
  {
    id: "audit",
    label: "Notes",
    href: "/audit",
    permission: "audit:read",
    icon: "notes",
    navLabel: "Notes",
    header: { label: "Notes", icon: "notes" },
    sidebar: { section: "workspace", order: 5 },
    landingPriority: 8,
  },
  {
    id: "quota",
    label: "Dashboards",
    href: "/quota",
    permission: "quota:allocate",
    icon: "dashboards",
    navLabel: "Dashboards",
    header: { label: "Dashboards", icon: "dashboards" },
    sidebar: { section: "workspace", order: 6 },
    landingPriority: 7,
  },
  {
    id: "sales-new",
    label: "Workflows",
    href: "/sales/new",
    permission: "sales:create",
    icon: "workflows",
    header: { label: "Workflows", icon: "workflows" },
  },
  {
    id: "sales-fix",
    label: "Workflows",
    pattern: /^\/sales\/[^/]+\/fix$/,
    permission: "sales:submit",
    icon: "workflows",
    header: { label: "Workflows", icon: "workflows" },
  },
  {
    id: "profile",
    label: "Profile",
    href: "/profile",
    icon: "profile",
    header: { label: "Profile", icon: "profile" },
  },
] as const;
