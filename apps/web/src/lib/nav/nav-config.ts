export type RouteIcon =
  | "search"
  | "settings"
  | "team"
  | "inventory"
  | "catalog"
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
  group?: string;
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
  // ── Primary ──────────────────────────────────────────────────────────────
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

  // ── Secondary › Comercial ─────────────────────────────────────────────────
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
      group: "Comercial",
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
    id: "sales",
    href: "/sales/records/new",
    label: "Ventas",
    navLabel: "Ventas",
    icon: "sales",
    sidebar: {
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
    activePrefixes: ["/sales", "/dashboard"],
  },
  {
    id: "quota",
    href: "/quota",
    label: "Cuota",
    navLabel: "Cuota",
    icon: "quota",
    header: { label: "Cuota", icon: "quota" },
    sidebar: { section: "secondary", order: 3, group: "Comercial" },
  },

  // ── Secondary › Operaciones ───────────────────────────────────────────────
  {
    id: "inventory",
    href: "/inventory",
    label: "Inventario",
    navLabel: "Inventario",
    icon: "inventory",
    header: { label: "Inventario", icon: "inventory" },
    sidebar: { section: "secondary", order: 4, group: "Operaciones" },
  },
  {
    id: "catalog",
    href: "/catalog",
    label: "Catálogo",
    navLabel: "Catálogo",
    icon: "catalog",
    header: { label: "Catálogo de productos", icon: "catalog" },
    sidebar: { section: "secondary", order: 5, group: "Operaciones" },
  },
  {
    id: "team",
    href: "/team",
    label: "Equipo",
    navLabel: "Equipo",
    icon: "team",
    header: { label: "Equipo", icon: "team" },
    sidebar: {
      section: "secondary",
      order: 6,
      group: "Operaciones",
      children: [
        { href: "/team", label: "Miembros", order: 1 },
        { href: "/team/invite", label: "Invitaciones", order: 2 },
      ],
    },
    activePrefixes: ["/team"],
  },

  // ── Secondary › Administración ────────────────────────────────────────────
  {
    id: "audit",
    href: "/audit/observability",
    label: "Auditoría",
    navLabel: "Auditoría",
    icon: "audit",
    header: { label: "Auditoría", icon: "audit" },
    sidebar: {
      section: "secondary",
      order: 7,
      group: "Administración",
      children: [
        { href: "/audit/observability", label: "Observabilidad", order: 1 },
        { href: "/audit/auth", label: "Autenticación", order: 2 },
        { href: "/audit/log", label: "Registro", order: 3 },
      ],
    },
    activePrefixes: ["/audit"],
  },

  // ── Header-only routes (no sidebar entry) ────────────────────────────────
  {
    id: "leads",
    href: "/sales/leads",
    label: "Prospectos",
    icon: "leads",
    header: { label: "Prospectos", icon: "leads" },
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
    id: "team-invite",
    href: "/team/invite",
    label: "Invitaciones",
    icon: "team",
    header: { label: "Invitaciones", icon: "team" },
  },
  {
    id: "audit-observability",
    href: "/audit/observability",
    label: "Observabilidad",
    icon: "audit",
    header: { label: "Observabilidad", icon: "audit" },
  },
  {
    id: "audit-auth",
    href: "/audit/auth",
    label: "Autenticación",
    icon: "audit",
    header: { label: "Autenticación", icon: "audit" },
  },
  {
    id: "audit-log",
    href: "/audit/log",
    label: "Registro de auditoría",
    icon: "audit",
    header: { label: "Registro de auditoría", icon: "audit" },
  },
  {
    id: "profile",
    href: "/settings/profile",
    label: "Perfil",
    icon: "profile",
    header: { label: "Perfil", icon: "profile" },
  },
];
