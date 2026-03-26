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
    match: /^\/leads\/[^/]+\/complete$/,
    header: { label: "Completar prospecto", icon: "leads" },
  },
  {
    match: /^\/leads\/[^/]+$/,
    header: { label: "Detalle del prospecto", icon: "leads" },
  },
  {
    match: /^\/review\/[^/]+$/,
    header: { label: "Revisar prospecto", icon: "review" },
  },
  {
    match: /^\/quotations\/[^/]+$/,
    header: { label: "Cotización", icon: "sales" },
  },
  {
    match: /^\/sales\/new\/[^/]+$/,
    header: { label: "Registrar venta", icon: "new-sale" },
  },
  {
    match: /^\/sales\/[0-9]+$/,
    header: { label: "Detalle de venta", icon: "sales" },
  },
  {
    match: /^\/integrations\/imports\/[^/]+$/,
    header: { label: "Detalle de importación", icon: "confirmed" },
  },
  {
    match: /^\/team\/members\/[^/]+\/capacity$/,
    header: { label: "Capacidad del ejecutivo", icon: "team" },
  },

  // Exact paths
  { match: "/dashboard", header: { label: "Inicio", icon: "dashboard" } },
  { match: "/schedule", header: { label: "Agenda", icon: "schedule" } },
  { match: "/leads", header: { label: "Prospectos", icon: "leads" } },
  { match: "/review", header: { label: "Revisión", icon: "review" } },
  { match: "/quotations", header: { label: "Cotizaciones", icon: "sales" } },
  { match: "/sales/crm", header: { label: "Ventas CRM", icon: "sales" } },
  {
    match: "/integrations",
    header: { label: "Integraciones", icon: "confirmed" },
  },
  {
    match: "/integrations/imports",
    header: { label: "Importaciones", icon: "confirmed" },
  },
  {
    match: "/integrations/exports",
    header: { label: "Exportaciones", icon: "confirmed" },
  },
  {
    match: "/me/capacity",
    header: { label: "Mi capacidad", icon: "capacity" },
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
    match: "/settings/capacity-policies",
    header: { label: "Políticas comerciales", icon: "settings" },
  },
  {
    match: "/settings/capacity-audit",
    header: { label: "Auditoría de capacidad", icon: "settings" },
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
    id: "schedule",
    href: "/schedule",
    activePrefixes: ["/schedule"],
    label: "Agenda",
    navLabel: "Agenda",
    icon: "schedule",
    section: "primary",
    order: 2,
  },

  // Secondary › Comercial
  {
    id: "leads",
    href: "/leads",
    activePrefixes: ["/leads", "/sales/new"],
    label: "Prospectos",
    navLabel: "Prospectos",
    icon: "leads",
    section: "secondary",
    order: 1,
    group: "Comercial",
  },
  {
    id: "my-capacity",
    href: "/me/capacity",
    activePrefixes: ["/me/capacity"],
    label: "Mi capacidad",
    navLabel: "Mi capacidad",
    icon: "capacity",
    section: "secondary",
    order: 2,
    group: "Comercial",
  },

  // Secondary › Operaciones
  {
    id: "review",
    href: "/review",
    activePrefixes: ["/review"],
    label: "Revisión",
    navLabel: "Revisión",
    icon: "review",
    section: "secondary",
    order: 3,
    group: "Operaciones",
  },
  {
    id: "quotations",
    href: "/quotations",
    activePrefixes: ["/quotations"],
    label: "Cotizaciones",
    navLabel: "Cotizaciones",
    icon: "sales",
    section: "secondary",
    order: 4,
    group: "Operaciones",
  },
  {
    id: "inventory",
    href: "/inventory",
    activePrefixes: ["/inventory"],
    label: "Inventario",
    navLabel: "Inventario",
    icon: "inventory",
    section: "secondary",
    order: 5,
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
    order: 6,
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
    id: "integrations",
    href: "/integrations",
    activePrefixes: ["/integrations"],
    label: "Integraciones",
    navLabel: "Integraciones",
    icon: "confirmed",
    section: "secondary",
    order: 7,
    group: "Administración",
    children: [
      { href: "/integrations/imports", label: "Importaciones", order: 1 },
      { href: "/integrations/exports", label: "Exportaciones", order: 2 },
    ],
  },
  {
    id: "audit",
    href: "/audit/log",
    activePrefixes: ["/audit"],
    label: "Auditoría",
    navLabel: "Auditoría",
    icon: "audit",
    section: "secondary",
    order: 8,
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
    order: 9,
    group: "Administración",
  },
];
