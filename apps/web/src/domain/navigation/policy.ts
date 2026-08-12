import { canAccessPath, type Role } from "~/domain/auth/access/route-policy";

import {
  PAGE_HEADERS,
  SIDEBAR_ENTRIES,
  type HeaderDescriptor,
  type SidebarChild,
  type SidebarEntry,
  type SidebarSection,
} from "./config";

export type {
  SidebarEntry,
  SidebarChild,
  HeaderDescriptor,
  SidebarSection,
} from "./config";

export interface SidebarGroup {
  label: string | undefined;
  items: SidebarEntry[];
}

const HEADER_FALLBACK: HeaderDescriptor = {
  label: "Espacio de trabajo",
  icon: "home",
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
  ).toSorted(sortByOrder);
}

export function getSidebarGrouped(
  role: Role,
  section: SidebarSection,
): SidebarGroup[] {
  const groups = new Map<string | undefined, SidebarEntry[]>();

  for (const entry of getSidebarEntries(role, section)) {
    const items = groups.get(entry.group);

    if (items) {
      items.push(entry);
    } else {
      groups.set(entry.group, [entry]);
    }
  }

  return Array.from(groups, ([label, items]) => ({
    label,
    items,
  }));
}

export function getSidebarChildren(
  role: Role,
  entryId: string,
): SidebarChild[] {
  const entry = SIDEBAR_ENTRIES.find((entry) => entry.id === entryId);

  if (!entry?.children) {
    return [];
  }

  return entry.children
    .filter((child) => canAccessPath(role, child.href))
    .toSorted((a, b) => a.order - b.order);
}

export function getNavigableRoutes(role: Role): SidebarEntry[] {
  return SIDEBAR_ENTRIES.filter((entry) =>
    canAccessPath(role, entry.href),
  ).toSorted(sortByOrder);
}

export function getHeaderRoute(pathname: string): HeaderDescriptor {
  for (const rule of PAGE_HEADERS) {
    const matches =
      typeof rule.match === "string"
        ? pathname === rule.match
        : rule.match.test(pathname);

    if (matches) {
      return rule.header;
    }
  }

  return HEADER_FALLBACK;
}
