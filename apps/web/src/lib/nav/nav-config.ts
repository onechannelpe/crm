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
    label: "Personas",
    navLabel: "Contactos",
    icon: "search",
    header: { label: "Personas", icon: "search" },
    sidebar: {
      section: "secondary",
      order: 1,
      children: [
        { href: "/contacts/people", label: "Personas", order: 1 },
        { href: "/contacts/companies", label: "Empresas", order: 2 },
      ],
    },
    activePrefixes: ["/contacts/people", "/contacts/companies"],
  },
  {
    id: "contacts-companies",
    href: "/contacts/companies",
    label: "Empresas",
    icon: "search",
    header: { label: "Empresas", icon: "search" },
  },
  {
    id: "team",
    href: "/team",
    label: "Equipo",
    navLabel: "Equipo",
    icon: "team",
    header: { label: "Team", icon: "team" },
    sidebar: { section: "secondary", order: 4 },
  },
  {
    id: "inventory",
    href: "/inventory",
    label: "Inventario",
    navLabel: "Inventario",
    icon: "inventory",
    header: { label: "Inventory", icon: "inventory" },
    sidebar: { section: "secondary", order: 3 },
  },
  {
    id: "leads",
    href: "/sales/leads",
    label: "Prospectos",
    icon: "leads",
    header: { label: "Leads", icon: "leads" },
  },
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Inicio",
    icon: "dashboard",
    header: { label: "Inicio", icon: "dashboard" },
    sidebar: { section: "primary", order: 1 },
  },
  {
    id: "sales-records-new",
    href: "/sales/records/new",
    label: "Crear venta",
    icon: "new-sale",
    header: { label: "Crear venta", icon: "new-sale" },
    sidebar: { section: "primary", order: 2 },
  },
  {
    id: "schedule",
    href: "/schedule",
    label: "Agenda",
    navLabel: "Agenda",
    icon: "schedule",
    header: { label: "Agenda", icon: "schedule" },
    sidebar: { section: "primary", order: 3 },
  },
  {
    id: "sales-confirmed",
    href: "/sales/confirmed",
    label: "Ventas confirmadas",
    icon: "confirmed",
    header: { label: "Ventas confirmadas", icon: "confirmed" },
  },
  {
    id: "sales-confirmations",
    href: "/sales/confirmations",
    label: "Cola de confirmaciones",
    icon: "review",
    header: { label: "Cola de confirmaciones", icon: "review" },
  },
  {
    id: "sales-exports",
    href: "/sales/reports/exports",
    label: "Exportaciones",
    icon: "confirmed",
    header: { label: "Exportaciones", icon: "confirmed" },
  },
  {
    id: "sales",
    href: "/sales/records/new",
    label: "Ventas",
    navLabel: "Ventas",
    icon: "sales",
    sidebar: {
      section: "secondary",
      order: 2,
      children: [
        { href: "/sales/leads", label: "Prospectos", order: 1 },
        { href: "/sales/confirmed", label: "Confirmadas", order: 4 },
        { href: "/sales/confirmations", label: "Cola", order: 5 },
        { href: "/sales/reports/exports", label: "Exportar", order: 6 },
      ],
    },
    activePrefixes: ["/sales", "/dashboard"],
  },
  {
    id: "audit",
    href: "/audit",
    label: "Auditoría",
    navLabel: "Auditoría",
    icon: "audit",
    header: { label: "Auditoría", icon: "audit" },
    sidebar: { section: "secondary", order: 5 },
  },
  {
    id: "quota",
    href: "/quota",
    label: "Cuota",
    navLabel: "Cuota",
    icon: "quota",
    header: { label: "Cuota", icon: "quota" },
    sidebar: { section: "secondary", order: 6 },
  },
  {
    id: "profile",
    href: "/settings/profile",
    label: "Perfil",
    icon: "profile",
    header: { label: "Perfil", icon: "profile" },
  },
];
