import { canAccessPath, type Role } from "~/lib/auth/access/route-policy";

import {
  PAGE_HEADERS,
  SIDEBAR_ENTRIES,
  type HeaderDescriptor,
  type RouteIcon,
  type SidebarChild,
  type SidebarEntry,
  type SidebarSection,
} from "./nav-config";

export type {
  SidebarEntry,
  SidebarChild,
  HeaderDescriptor,
  RouteIcon,
  SidebarSection,
} from "./nav-config";

export interface SidebarGroup {
  label: string | undefined;
  items: SidebarEntry[];
}

const HEADER_FALLBACK: HeaderDescriptor = {
  label: "Espacio de trabajo",
  icon: "dashboard",
};

function sortByOrder(a: SidebarEntry, b: SidebarEntry): number {
  return a.order - b.order;
}

export function getSidebarEntries(
  role: Role,
  section: SidebarSection,
): SidebarEntry[] {
  return SIDEBAR_ENTRIES.filter(
    (entry) => entry.section === section && canAccessPath(role, entry.href),
  ).sort(sortByOrder);
}

export function getSidebarGrouped(
  role: Role,
  section: SidebarSection,
): SidebarGroup[] {
  const entries = getSidebarEntries(role, section);
  const groups: SidebarGroup[] = [];
  const seen = new Map<string | undefined, SidebarEntry[]>();

  for (const entry of entries) {
    const key = entry.group;
    if (!seen.has(key)) {
      const items: SidebarEntry[] = [];
      seen.set(key, items);
      groups.push({ label: key, items });
    }
    seen.get(key)!.push(entry);
  }

  return groups;
}

export function getSidebarChildren(
  role: Role,
  entryId: string,
): SidebarChild[] {
  const entry = SIDEBAR_ENTRIES.find((e) => e.id === entryId);
  if (!entry?.children) return [];

  return entry.children
    .filter((child) => canAccessPath(role, child.href))
    .sort((a, b) => a.order - b.order);
}

export function getNavigableRoutes(role: Role): SidebarEntry[] {
  return SIDEBAR_ENTRIES.filter((entry) => canAccessPath(role, entry.href));
}

export function getHeaderRoute(pathname: string): HeaderDescriptor {
  for (const rule of PAGE_HEADERS) {
    if (typeof rule.match === "string") {
      if (pathname === rule.match) return rule.header;
    } else {
      if (rule.match.test(pathname)) return rule.header;
    }
  }
  return HEADER_FALLBACK;
}
