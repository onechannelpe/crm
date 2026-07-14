import type { TileColor } from "~/components/ui/display/tinted-icon-tile/tinted-icon-tile";

export type RouteIcon =
  | "search"
  | "settings"
  | "team"
  | "inventory"
  | "leads"
  | "rate-simulator"
  | "dashboard"
  | "audit"
  | "capacity"
  | "profile"
  | "schedule"
  | "monitoring"
  | "business-stats";

export type SidebarSection = "primary" | "secondary";

export interface SidebarChild {
  href: string;
  label: string;
  order: number;
}

export interface SidebarEntry {
  id: string;
  href: string;
  activePrefixes: string[];
  label: string;
  navLabel?: string;
  icon: RouteIcon;
  tileColor?: TileColor;
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
  match: string | RegExp;
  header: HeaderDescriptor;
}

// More specific rules must appear before broader patterns.
export const PAGE_HEADERS: PageHeaderRule[] = [
  {
    match: /^\/records\/[^/]+$/,
    header: { label: "Registros", icon: "leads" },
  },
  { match: "/dashboard", header: { label: "Inicio", icon: "dashboard" } },
  { match: "/schedule", header: { label: "Agenda", icon: "schedule" } },
  { match: "/records", header: { label: "Registros", icon: "leads" } },
  {
    match: "/rate-simulator",
    header: { label: "Simulador de tasas", icon: "rate-simulator" },
  },
  {
    match: "/me/capacity",
    header: { label: "Mi capacidad", icon: "capacity" },
  },
  { match: "/inventory", header: { label: "Inventario", icon: "inventory" } },
  {
    match: "/fulfillment",
    header: { label: "Entregas", icon: "inventory" },
  },
  { match: "/team", header: { label: "Capacidad del equipo", icon: "team" } },
  {
    match: "/team/requests",
    header: { label: "Solicitudes", icon: "team" },
  },
  { match: "/monitoring", header: { label: "Monitoreo", icon: "monitoring" } },
  {
    match: "/business-stats",
    header: { label: "Estadísticas de negocio", icon: "business-stats" },
  },
  { match: "/settings/profile", header: { label: "Perfil", icon: "profile" } },
  {
    match: "/settings/capacity-policies",
    header: { label: "Políticas comerciales", icon: "settings" },
  },
  {
    match: "/settings/event-logs",
    header: { label: "Registro de eventos", icon: "settings" },
  },
];

export const SIDEBAR_ENTRIES: SidebarEntry[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    activePrefixes: ["/dashboard"],
    label: "Inicio",
    icon: "dashboard",
    tileColor: "blue",
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
    tileColor: "purple",
    section: "primary",
    order: 2,
  },
  {
    id: "records",
    href: "/records",
    activePrefixes: ["/records"],
    label: "Registros",
    navLabel: "Registros",
    icon: "leads",
    tileColor: "blue",
    section: "secondary",
    order: 1,
    group: "Comercial",
  },
  {
    id: "rate-simulator",
    href: "/rate-simulator",
    activePrefixes: ["/rate-simulator"],
    label: "Simulador de tasas",
    navLabel: "Simulador de tasas",
    icon: "rate-simulator",
    tileColor: "green",
    section: "secondary",
    order: 2,
    group: "Comercial",
  },
  {
    id: "my-capacity",
    href: "/me/capacity",
    activePrefixes: ["/me/capacity"],
    label: "Mi capacidad",
    navLabel: "Mi capacidad",
    icon: "capacity",
    tileColor: "turquoise",
    section: "secondary",
    order: 3,
    group: "Comercial",
  },
  {
    id: "inventory",
    href: "/inventory",
    activePrefixes: ["/inventory"],
    label: "Inventario",
    navLabel: "Inventario",
    icon: "inventory",
    tileColor: "orange",
    section: "secondary",
    order: 4,
    group: "Operaciones",
  },
  {
    id: "fulfillment",
    href: "/fulfillment",
    activePrefixes: ["/fulfillment"],
    label: "Entregas",
    navLabel: "Entregas",
    icon: "inventory",
    tileColor: "orange",
    section: "secondary",
    order: 6,
    group: "Operaciones",
  },
  {
    id: "team",
    href: "/team",
    activePrefixes: ["/team"],
    label: "Equipo",
    navLabel: "Equipo",
    icon: "team",
    tileColor: "turquoise",
    section: "secondary",
    order: 5,
    group: "Operaciones",
    children: [
      { href: "/team", label: "Capacidad", order: 1 },
      { href: "/team/requests", label: "Solicitudes", order: 2 },
    ],
  },
  {
    id: "business-stats",
    href: "/business-stats",
    activePrefixes: ["/business-stats"],
    label: "Estadísticas de negocio",
    navLabel: "Negocio",
    icon: "business-stats",
    tileColor: "green",
    section: "secondary",
    order: 7,
    group: "Negocio",
  },
  {
    id: "monitoring",
    href: "/monitoring",
    activePrefixes: ["/monitoring"],
    label: "Monitoreo",
    navLabel: "Monitoreo",
    icon: "monitoring",
    tileColor: "yellow",
    section: "secondary",
    order: 8,
    group: "Administración",
  },
];
