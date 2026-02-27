import type { JSX } from "solid-js";

import SettingsIcon from "~/components/icons/settings";
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
    label: "Profile",
    href: "/settings/profile",
    icon: UserIcon,
    section: "user",
  },
  {
    id: "general",
    label: "General",
    href: "/settings/general",
    icon: SettingsIcon,
    section: "workspace",
  },
  {
    id: "security",
    label: "Security",
    href: "/settings/security",
    icon: ShieldCheck,
    section: "workspace",
    advanced: true,
  },
  {
    id: "login-protection",
    label: "Login protection",
    href: "/settings/login-protection",
    icon: ShieldCheck,
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
  return section === "user" ? "User" : "Workspace";
}

export function getSettingsSectionHref(section: SettingsNavSectionId): string {
  const defaultItem = SETTINGS_NAV_ITEMS.find(
    (item) => item.section === section && !item.advanced,
  );

  return defaultItem?.href ?? "/settings";
}
