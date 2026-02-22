export type RouteIcon =
  | "search"
  | "settings"
  | "team"
  | "inventory"
  | "sales"
  | "leads"
  | "dashboard"
  | "new-sale"
  | "approved"
  | "review"
  | "audit"
  | "quota"
  | "profile";

export type SidebarSection = "quick" | "workspace";

export interface NavChild {
  href: string;
  label: string;
  order: number;
}

export interface SidebarConfig {
  section: SidebarSection;
  order: number;
  children?: NavChild[];
}

export interface HeaderConfig {
  label: string;
  icon: RouteIcon;
}

export interface NavRoute {
  id: string;
  href: string;
  label: string;
  navLabel?: string;
  icon: RouteIcon;
  header?: HeaderConfig;
  sidebar?: SidebarConfig;
  activePrefixes?: string[];
}

export const NAV_ROUTES: NavRoute[] = [
  {
    id: "contacts-people",
    href: "/contacts/people",
    label: "People",
    navLabel: "Contacts",
    icon: "search",
    header: { label: "People", icon: "search" },
    sidebar: {
      section: "quick",
      order: 1,
      children: [
        { href: "/contacts/people", label: "People", order: 1 },
        { href: "/contacts/companies", label: "Companies", order: 2 },
      ],
    },
    activePrefixes: ["/contacts/people", "/contacts/companies"],
  },
  {
    id: "contacts-companies",
    href: "/contacts/companies",
    label: "Companies",
    icon: "search",
    header: { label: "Companies", icon: "search" },
  },
  {
    id: "settings",
    href: "/settings",
    label: "Settings",
    navLabel: "Settings",
    icon: "settings",
    header: { label: "Settings", icon: "settings" },
    sidebar: { section: "quick", order: 2 },
  },
  {
    id: "team",
    href: "/team",
    label: "Team",
    navLabel: "Team",
    icon: "team",
    header: { label: "Team", icon: "team" },
    sidebar: { section: "workspace", order: 1 },
  },
  {
    id: "team-new",
    href: "/team/new",
    label: "New team member",
    icon: "team",
    header: { label: "Team", icon: "team" },
  },
  {
    id: "inventory",
    href: "/inventory",
    label: "Inventory",
    navLabel: "Inventory",
    icon: "inventory",
    header: { label: "Inventory", icon: "inventory" },
    sidebar: { section: "workspace", order: 3 },
  },
  {
    id: "leads",
    href: "/leads",
    label: "Leads",
    icon: "leads",
    header: { label: "Leads", icon: "leads" },
  },
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Pipeline",
    icon: "dashboard",
    header: { label: "Pipeline", icon: "dashboard" },
  },
  {
    id: "sales-new",
    href: "/sales/new",
    label: "New sale",
    icon: "new-sale",
    header: { label: "New sale", icon: "new-sale" },
  },
  {
    id: "sales-approved",
    href: "/sales/approved",
    label: "Approved sales",
    icon: "approved",
    header: { label: "Approved sales", icon: "approved" },
  },
  {
    id: "review",
    href: "/review",
    label: "Review queue",
    icon: "review",
    header: { label: "Review queue", icon: "review" },
  },
  {
    id: "sales",
    href: "/leads",
    label: "Sales",
    navLabel: "Sales",
    icon: "sales",
    sidebar: {
      section: "workspace",
      order: 2,
      children: [
        { href: "/leads", label: "Leads", order: 1 },
        { href: "/dashboard", label: "Pipeline", order: 2 },
        { href: "/sales/new", label: "New sale", order: 3 },
        { href: "/sales/approved", label: "Approved", order: 4 },
        { href: "/review", label: "Review queue", order: 5 },
      ],
    },
    activePrefixes: ["/leads", "/dashboard", "/sales", "/review"],
  },
  {
    id: "audit",
    href: "/audit",
    label: "Audit",
    navLabel: "Audit",
    icon: "audit",
    header: { label: "Audit", icon: "audit" },
    sidebar: { section: "workspace", order: 4 },
  },
  {
    id: "quota",
    href: "/quota",
    label: "Quota",
    navLabel: "Quota",
    icon: "quota",
    header: { label: "Quota", icon: "quota" },
    sidebar: { section: "workspace", order: 5 },
  },
  {
    id: "profile",
    href: "/profile",
    label: "Profile",
    icon: "profile",
    header: { label: "Profile", icon: "profile" },
  },
];
