export type RouteIcon =
  | "search"
  | "settings"
  | "team"
  | "inventory"
  | "sales"
  | "leads"
  | "dashboard"
  | "new-sale"
  | "confirmed"
  | "review"
  | "audit"
  | "quota"
  | "profile"
  | "schedule";

export type SidebarSection = "primary" | "secondary";

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
      section: "secondary",
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
    sidebar: { section: "secondary", order: 7 },
  },
  {
    id: "team",
    href: "/team",
    label: "Team",
    navLabel: "Team",
    icon: "team",
    header: { label: "Team", icon: "team" },
    sidebar: { section: "secondary", order: 4 },
  },
  {
    id: "team-new",
    href: "/team/new",
    label: "Create team member",
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
    sidebar: { section: "secondary", order: 3 },
  },
  {
    id: "leads",
    href: "/sales/leads",
    label: "Leads",
    icon: "leads",
    header: { label: "Leads", icon: "leads" },
  },
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Home",
    icon: "dashboard",
    header: { label: "Home", icon: "dashboard" },
    sidebar: { section: "primary", order: 1 },
  },
  {
    id: "sales-records-new",
    href: "/sales/records/new",
    label: "Create sale",
    icon: "new-sale",
    header: { label: "Create sale", icon: "new-sale" },
    sidebar: { section: "primary", order: 2 },
  },
  {
    id: "schedule",
    href: "/schedule",
    label: "Schedule",
    navLabel: "Schedule",
    icon: "schedule",
    header: { label: "Schedule", icon: "schedule" },
    sidebar: { section: "primary", order: 3 },
  },
  {
    id: "sales-confirmed",
    href: "/sales/confirmed",
    label: "Confirmed sales",
    icon: "confirmed",
    header: { label: "Confirmed sales", icon: "confirmed" },
  },
  {
    id: "sales-confirmations",
    href: "/sales/confirmations",
    label: "Confirmation queue",
    icon: "review",
    header: { label: "Confirmation queue", icon: "review" },
  },
  {
    id: "sales-exports",
    href: "/sales/reports/exports",
    label: "Exports",
    icon: "confirmed",
    header: { label: "Exports", icon: "confirmed" },
  },
  {
    id: "sales",
    href: "/sales/records/new",
    label: "Sales",
    navLabel: "Sales",
    icon: "sales",
    sidebar: {
      section: "secondary",
      order: 2,
      children: [
        { href: "/sales/leads", label: "Leads", order: 1 },
        { href: "/sales/confirmed", label: "Confirmed", order: 4 },
        { href: "/sales/confirmations", label: "Confirmations", order: 5 },
        { href: "/sales/reports/exports", label: "Exports", order: 6 },
      ],
    },
    activePrefixes: ["/sales", "/dashboard"],
  },
  {
    id: "audit",
    href: "/audit",
    label: "Audit",
    navLabel: "Audit",
    icon: "audit",
    header: { label: "Audit", icon: "audit" },
    sidebar: { section: "secondary", order: 5 },
  },
  {
    id: "quota",
    href: "/quota",
    label: "Quota",
    navLabel: "Quota",
    icon: "quota",
    header: { label: "Quota", icon: "quota" },
    sidebar: { section: "secondary", order: 6 },
  },
  {
    id: "profile",
    href: "/profile",
    label: "Profile",
    icon: "profile",
    header: { label: "Profile", icon: "profile" },
  },
];
