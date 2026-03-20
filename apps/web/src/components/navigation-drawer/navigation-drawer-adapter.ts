import { SETTINGS_NAV_ITEMS } from "~/components/layout/settings-nav";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import {
  getSidebarChildren,
  getSidebarEntries,
  getSidebarGrouped,
  type SidebarEntry,
} from "~/lib/nav/nav-policy";
import type { Role } from "~/lib/auth/access/route-policy";

export interface DrawerNavChild {
  href: string;
  label: string;
}

export interface DrawerNavEntry {
  id: string;
  href: string;
  label: string;
  icon: SidebarEntry["icon"];
  children: DrawerNavChild[];
  activePrefixes: string[];
}

export interface DrawerNavGroup {
  id: string;
  label: string;
  items: DrawerNavEntry[];
}

export function getMainPrimaryEntries(role: Role): DrawerNavEntry[] {
  return getSidebarEntries(role, "primary").map((entry) => ({
    id: entry.id,
    href: entry.href,
    label: entry.navLabel ?? entry.label,
    icon: entry.icon,
    children: [],
    activePrefixes: entry.activePrefixes,
  }));
}

export function getMainSecondaryGroups(role: Role): DrawerNavGroup[] {
  const grouped = getSidebarGrouped(role, "secondary");

  return grouped.map((group, index) => ({
    id: group.label?.toLowerCase().replace(/\s+/g, "-") ?? `group-${index}`,
    label: group.label ?? "General",
    items: group.items.map((entry) => ({
      id: entry.id,
      href: entry.href,
      label: entry.navLabel ?? entry.label,
      icon: entry.icon,
      children: getSidebarChildren(role, entry.id).map((child) => ({
        href: child.href,
        label: child.label,
      })),
      activePrefixes: entry.activePrefixes,
    })),
  }));
}

export function getSettingsGroups() {
  const bySection = new Map<string, typeof SETTINGS_NAV_ITEMS>();

  for (const item of SETTINGS_NAV_ITEMS) {
    const list = bySection.get(item.section) ?? [];
    list.push(item);
    bySection.set(item.section, list);
  }

  return [
    {
      id: "user",
      label: "Usuario",
      items: bySection.get("user") ?? [],
    },
    {
      id: "workspace",
      label: "Espacio de trabajo",
      items: bySection.get("workspace") ?? [],
    },
  ] as const;
}

export function isEntryActive(pathname: string, entry: DrawerNavEntry) {
  return entry.activePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isChildActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getEntryIcon(icon: SidebarEntry["icon"]) {
  return ICON_BY_ROUTE[icon];
}
