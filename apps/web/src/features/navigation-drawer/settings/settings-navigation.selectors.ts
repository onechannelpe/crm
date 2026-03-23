import UserIcon from "~/components/icons/user";

import { SETTINGS_NAV_SECTIONS } from "./settings-navigation-config";
import { settingsItemMatchesPath } from "./settings-navigation-path-match";
import type {
  SettingsNavItem,
  SettingsNavSectionId,
} from "./settings-navigation.types";

export function flattenSettingsItems(
  items: SettingsNavItem[],
): SettingsNavItem[] {
  const result: SettingsNavItem[] = [];

  for (const item of items) {
    result.push(item);

    if (item.subItems && item.subItems.length > 0) {
      result.push(...flattenSettingsItems(item.subItems));
    }
  }

  return result;
}

export const SETTINGS_NAV_ITEMS = SETTINGS_NAV_SECTIONS.flatMap((section) =>
  flattenSettingsItems(section.items),
);

export function getCurrentSettingsItem(pathname: string): SettingsNavItem {
  const firstWithHref = SETTINGS_NAV_ITEMS.find((item) => Boolean(item.href));

  return (
    SETTINGS_NAV_ITEMS.find((item) =>
      settingsItemMatchesPath(pathname, item.href, item.matchSubPages),
    ) ??
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
    (currentSection) => currentSection.id === section,
  );

  return matchedSection?.label ?? "Ajustes";
}

export function getSettingsSectionHref(
  section: SettingsNavSectionId,
): string | undefined {
  const matchedSection = SETTINGS_NAV_SECTIONS.find(
    (currentSection) => currentSection.id === section,
  );
  if (!matchedSection) {
    return undefined;
  }

  return flattenSettingsItems(matchedSection.items).find((item) =>
    Boolean(item.href),
  )?.href;
}
