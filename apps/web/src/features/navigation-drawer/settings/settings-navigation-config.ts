import type { JSX } from "solid-js";

import CircleQuestionMark from "~/components/icons/circle-question-mark";
import LogOut from "~/components/icons/log-out";
import Package from "~/components/icons/package";
import Settings from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import UserIcon from "~/components/icons/user";

import { settingsItemMatchesPath } from "./settings-navigation-path-match";

export type SettingsNavSectionId = "user" | "workspace" | "other";

export interface SettingsNavItem {
  id: string;
  label: string;
  href?: string;
  icon: (props: { class?: string; size?: number }) => JSX.Element;
  section: SettingsNavSectionId;
  advanced?: boolean;
  indentationLevel?: 1 | 2;
  matchSubPages?: boolean;
  subItems?: SettingsNavItem[];
  action?: "logout";
  modifier?: "new" | "soon";
}

export interface SettingsNavSection {
  id: SettingsNavSectionId;
  label: string;
  items: SettingsNavItem[];
}

export const SETTINGS_NAV_SECTIONS: SettingsNavSection[] = [
  {
    id: "user",
    label: "Usuario",
    items: [
      {
        id: "profile",
        label: "Perfil",
        href: "/settings/profile",
        icon: UserIcon,
        section: "user",
      },
    ],
  },
  {
    id: "workspace",
    label: "Espacio de trabajo",
    items: [
      {
        id: "security",
        label: "Seguridad",
        href: "/settings/security",
        icon: ShieldCheck,
        section: "workspace",
        advanced: true,
      },
      {
        id: "login-protection",
        label: "Proteccion de inicio de sesion",
        href: "/settings/login-protection",
        icon: ShieldCheck,
        section: "workspace",
        advanced: true,
      },
      {
        id: "security-policies",
        label: "Politicas de riesgo",
        href: "/settings/security-policies",
        icon: ShieldCheck,
        section: "workspace",
        advanced: true,
      },
      {
        id: "sales-policies",
        label: "Politicas comerciales",
        href: "/settings/capacity-policies",
        icon: Settings,
        section: "workspace",
        advanced: true,
      },
      {
        id: "capacity-audit",
        label: "Auditoria de capacidad",
        href: "/settings/capacity-audit",
        icon: Settings,
        section: "workspace",
        advanced: true,
      },
      {
        id: "catalog",
        label: "Catalogo",
        href: "/settings/catalog",
        icon: Package,
        section: "workspace",
        advanced: true,
        modifier: "new",
      },
    ],
  },
  {
    id: "other",
    label: "Otros",
    items: [
      {
        id: "documentation",
        label: "Documentacion",
        href: "/docs",
        icon: CircleQuestionMark,
        section: "other",
      },
      {
        id: "logout",
        label: "Cerrar sesion",
        icon: LogOut,
        section: "other",
        action: "logout",
      },
    ],
  },
];

function flattenItems(items: SettingsNavItem[]): SettingsNavItem[] {
  const result: SettingsNavItem[] = [];

  for (const item of items) {
    result.push(item);

    if (item.subItems && item.subItems.length > 0) {
      result.push(...flattenItems(item.subItems));
    }
  }

  return result;
}

export const SETTINGS_NAV_ITEMS = SETTINGS_NAV_SECTIONS.flatMap((section) =>
  flattenItems(section.items),
);

export function getCurrentSettingsItem(pathname: string): SettingsNavItem {
  const firstWithHref = SETTINGS_NAV_ITEMS.find((item) => Boolean(item.href));

  return (
    SETTINGS_NAV_ITEMS.find((item) => {
      return settingsItemMatchesPath(pathname, item.href, item.matchSubPages);
    }) ??
    firstWithHref ?? {
      id: "profile",
      label: "Perfil",
      href: "/settings/profile",
      icon: UserIcon,
      section: "user",
    }
  );
}

export function getSettingsSectionLabel(section: SettingsNavSectionId): string {
  const matchedSection = SETTINGS_NAV_SECTIONS.find(
    (item) => item.id === section,
  );

  return matchedSection?.label ?? "Ajustes";
}

export function getSettingsSectionHref(
  section: SettingsNavSectionId,
): string | undefined {
  const matchedSection = SETTINGS_NAV_SECTIONS.find(
    (item) => item.id === section,
  );
  if (!matchedSection) {
    return undefined;
  }

  return flattenItems(matchedSection.items).find((item) => Boolean(item.href))
    ?.href;
}
