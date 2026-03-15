import type { JSX } from "solid-js";

import Package from "~/components/icons/package";
import Settings from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import UserIcon from "~/components/icons/user";

export type SettingsNavSectionId = "user" | "workspace";

export interface SettingsNavItem {
  id: string;
  label: string;
  href: string;
  icon: (props: { class?: string; size?: number }) => JSX.Element;
  section: SettingsNavSectionId;
  advanced?: boolean;
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: "profile",
    label: "Perfil",
    href: "/settings/profile",
    icon: UserIcon,
    section: "user",
  },
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
    label: "Protección de inicio de sesión",
    href: "/settings/login-protection",
    icon: ShieldCheck,
    section: "workspace",
    advanced: true,
  },
  {
    id: "security-policies",
    label: "Políticas de riesgo",
    href: "/settings/security-policies",
    icon: ShieldCheck,
    section: "workspace",
    advanced: true,
  },
  {
    id: "sales-policies",
    label: "Políticas comerciales",
    href: "/admin/capacity-policies",
    icon: Settings,
    section: "workspace",
    advanced: true,
  },
  {
    id: "catalog",
    label: "Catálogo",
    href: "/settings/catalog",
    icon: Package,
    section: "workspace",
    advanced: true,
  },
];

export function getCurrentSettingsItem(pathname: string): SettingsNavItem {
  return (
    SETTINGS_NAV_ITEMS.find((item) => pathname.startsWith(item.href)) ??
    SETTINGS_NAV_ITEMS[0]
  );
}

export function getSettingsSectionLabel(section: SettingsNavSectionId): string {
  return section === "user" ? "Usuario" : "Espacio de trabajo";
}

export function getSettingsSectionHref(section: SettingsNavSectionId): string {
  const defaultItem = SETTINGS_NAV_ITEMS.find(
    (item) => item.section === section && !item.advanced,
  );

  return defaultItem?.href ?? "/settings/profile";
}
