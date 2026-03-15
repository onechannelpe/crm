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
  | "capacity"
  | "profile"
  | "schedule"
  | "monitoring";

export type SidebarSection = "primary" | "secondary";

export interface SidebarChild {
  href: string;
  label: string;
  order: number;
}

export interface SidebarEntry {
  id: string;
  href: string;
  /** Paths that mark this entry active in the sidebar. */
  activePrefixes: string[];
  label: string;
  /** Display label in sidebar/command palette. Defaults to label. */
  navLabel?: string;
  icon: RouteIcon;
  section: SidebarSection;
  order: number;
  group?: string;
  children?: SidebarChild[];
}

export interface HeaderDescriptor {
  label: string;
  icon: RouteIcon;
}

export interface PageHeaderRule {
  /** Exact path string or RegExp. String uses strict equality; RegExp uses test(). */
  match: string | RegExp;
  header: HeaderDescriptor;
}

// Ordered: more specific rules (exact paths, longer prefixes) before broader patterns.
export const PAGE_HEADERS: PageHeaderRule[] = [
  // Dynamic patterns first
  {
    match: /^\/sales\/records\/[^/]+\/edit$/,
    header: { label: "Editar venta", icon: "new-sale" },
  },
  {
    match: /^\/sales\/reports\/exports\/[^/]+$/,
    header: { label: "Detalle", icon: "confirmed" },
  },
  {
    match: /^\/team\/members\/[^/]+$/,
    header: { label: "Capacidad del ejecutivo", icon: "team" },
  },

  // Exact paths
  { match: "/dashboard", header: { label: "Inicio", icon: "dashboard" } },
  {
    match: "/sales/records/new",
    header: { label: "Crear venta", icon: "new-sale" },
  },
  { match: "/schedule", header: { label: "Agenda", icon: "schedule" } },
  { match: "/contacts/search", header: { label: "Buscar contactos", icon: "search" } },
  { match: "/sales/leads", header: { label: "Prospectos", icon: "leads" } },
  { match: "/me/capacity", header: { label: "Mi capacidad", icon: "capacity" } },
  {
    match: "/sales/confirmed",
    header: { label: "Ventas confirmadas", icon: "confirmed" },
  },
  {
    match: "/sales/confirmations",
    header: { label: "Cola de confirmaciones", icon: "review" },
  },
  {
    match: "/sales/reports/exports",
    header: { label: "Exportaciones", icon: "confirmed" },
  },
  { match: "/inventory", header: { label: "Inventario", icon: "inventory" } },
  { match: "/team", header: { label: "Equipo", icon: "team" } },
  {
    match: "/team/requests",
    header: { label: "Solicitudes", icon: "team" },
  },
  { match: "/team/invite", header: { label: "Invitaciones", icon: "team" } },
  {
    match: "/team/import",
    header: { label: "Importar miembros", icon: "team" },
  },
  { match: "/audit/auth", header: { label: "Autenticación", icon: "audit" } },
  {
    match: "/audit/log",
    header: { label: "Registro de auditoría", icon: "audit" },
  },
  { match: "/monitoring", header: { label: "Monitoreo", icon: "monitoring" } },
  { match: "/settings/profile", header: { label: "Perfil", icon: "profile" } },
  {
    match: "/settings/sales-policies",
    header: { label: "Políticas comerciales", icon: "settings" },
  },
];

export const SIDEBAR_ENTRIES: SidebarEntry[] = [
  // Primary
  {
    id: "dashboard",
    href: "/dashboard",
    activePrefixes: ["/dashboard"],
    label: "Inicio",
    icon: "dashboard",
    section: "primary",
    order: 1,
  },
  {
    id: "sales-records-new",
    href: "/sales/records/new",
    activePrefixes: ["/sales/records/new"],
    label: "Crear venta",
    icon: "new-sale",
    section: "primary",
    order: 2,
  },
  {
    id: "schedule",
    href: "/schedule",
    activePrefixes: ["/schedule"],
    label: "Agenda",
    navLabel: "Agenda",
    icon: "schedule",
    section: "primary",
    order: 3,
  },

  // Secondary › Comercial
  {
    id: "contacts-search",
    href: "/contacts/search",
    activePrefixes: ["/contacts/search"],
    label: "Buscar contactos",
    navLabel: "Contactos",
    icon: "search",
    section: "secondary",
    order: 1,
    group: "Comercial",
    children: [{ href: "/contacts/search", label: "Buscar", order: 1 }],
  },
  {
    id: "sales",
    href: "/sales/leads",
    activePrefixes: ["/sales"],
    label: "Ventas",
    navLabel: "Ventas",
    icon: "sales",
    section: "secondary",
    order: 2,
    group: "Comercial",
    children: [
      { href: "/sales/leads", label: "Prospectos", order: 1 },
      { href: "/sales/confirmed", label: "Confirmadas", order: 4 },
      { href: "/sales/confirmations", label: "Cola", order: 5 },
      { href: "/sales/reports/exports", label: "Exportar", order: 6 },
    ],
  },
  {
    id: "my-capacity",
    href: "/me/capacity",
    activePrefixes: ["/me/capacity"],
    label: "Mi capacidad",
    navLabel: "Mi capacidad",
    icon: "capacity",
    section: "secondary",
    order: 3,
    group: "Comercial",
  },

  // Secondary › Operaciones
  {
    id: "inventory",
    href: "/inventory",
    activePrefixes: ["/inventory"],
    label: "Inventario",
    navLabel: "Inventario",
    icon: "inventory",
    section: "secondary",
    order: 4,
    group: "Operaciones",
  },
  {
    id: "team",
    href: "/team",
    activePrefixes: ["/team"],
    label: "Equipo",
    navLabel: "Equipo",
    icon: "team",
    section: "secondary",
    order: 5,
    group: "Operaciones",
    children: [
      { href: "/team", label: "Miembros", order: 1 },
      { href: "/team/requests", label: "Solicitudes", order: 2 },
      { href: "/team/invite", label: "Invitaciones", order: 3 },
      { href: "/team/import", label: "Importar", order: 4 },
    ],
  },

  // Secondary › Administración
  {
    id: "audit",
    href: "/audit/log",
    activePrefixes: ["/audit"],
    label: "Auditoría",
    navLabel: "Auditoría",
    icon: "audit",
    section: "secondary",
    order: 6,
    group: "Administración",
    children: [
      { href: "/audit/log", label: "Registro", order: 1 },
      { href: "/audit/auth", label: "Autenticación", order: 2 },
    ],
  },
  {
    id: "monitoring",
    href: "/monitoring",
    activePrefixes: ["/monitoring"],
    label: "Monitoreo",
    navLabel: "Monitoreo",
    icon: "monitoring",
    section: "secondary",
    order: 7,
    group: "Administración",
  },
];
