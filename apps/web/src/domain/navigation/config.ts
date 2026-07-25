import type { TileColor } from "~/shared/ui/tile-color";

export type RouteIcon =
  | "search"
  | "settings"
  | "team"
  | "inventory"
  | "leads"
  | "rate-simulator"
  | "home"
  | "audit"
  | "capacity"
  | "profile"
  | "schedule"
  | "monitoring"
  | "dashboards";

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
  tileColor?: TileColor;
}

export interface PageHeaderRule {
  match: string | RegExp;
  header: HeaderDescriptor;
}

// More specific rules must appear before broader patterns. tileColor mirrors
// the sidebar entry for the same destination so the page header tile matches
// the navigation tile.
export const PAGE_HEADERS: PageHeaderRule[] = [
  {
    match: /^\/records\/[^/]+$/,
    header: { label: "Registros", icon: "leads", tileColor: "blue" },
  },
  {
    match: "/home",
    header: { label: "Inicio", icon: "home", tileColor: "blue" },
  },
  {
    match: "/schedule",
    header: { label: "Agenda", icon: "schedule", tileColor: "purple" },
  },
  {
    match: "/records",
    header: { label: "Registros", icon: "leads", tileColor: "blue" },
  },
  {
    match: "/inquiries",
    header: { label: "Consultas", icon: "search", tileColor: "yellow" },
  },
  { match: "/search", header: { label: "Búsqueda", icon: "search" } },
  {
    match: "/rate-simulator",
    header: {
      label: "Simulador de tasas",
      icon: "rate-simulator",
      tileColor: "green",
    },
  },
  {
    match: "/me/capacity",
    header: { label: "Mi capacidad", icon: "capacity", tileColor: "turquoise" },
  },
  {
    match: "/inventory",
    header: { label: "Inventario", icon: "inventory", tileColor: "orange" },
  },
  {
    match: "/fulfillment",
    header: { label: "Entregas", icon: "inventory", tileColor: "orange" },
  },
  {
    match: "/team",
    header: {
      label: "Capacidad del equipo",
      icon: "team",
      tileColor: "turquoise",
    },
  },
  {
    match: "/team/requests",
    header: { label: "Solicitudes", icon: "team", tileColor: "turquoise" },
  },
  {
    match: "/monitoring",
    header: { label: "Monitoreo", icon: "monitoring", tileColor: "yellow" },
  },
  {
    match: /^\/dashboards\/merchant-gpv(?:\/.*)?$/,
    header: { label: "GPV de comercios", icon: "dashboards" },
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
    id: "home",
    href: "/home",
    activePrefixes: ["/home"],
    label: "Inicio",
    icon: "home",
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
    id: "inquiries",
    href: "/inquiries",
    activePrefixes: ["/inquiries"],
    label: "Consultas",
    navLabel: "Consultas",
    icon: "search",
    tileColor: "yellow",
    section: "secondary",
    order: 2,
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
    order: 3,
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
    order: 4,
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
    id: "dashboards",
    href: "/dashboards/merchant-gpv",
    activePrefixes: ["/dashboards"],
    label: "GPV de comercios",
    navLabel: "GPV de comercios",
    icon: "dashboards",
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
