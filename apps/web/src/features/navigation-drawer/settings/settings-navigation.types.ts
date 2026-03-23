import type { JSX } from "solid-js";

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
