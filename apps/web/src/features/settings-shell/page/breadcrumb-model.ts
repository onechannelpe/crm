export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export type MobileBackAction =
  | { kind: "link"; label: string; href: string }
  | { kind: "open-settings-drawer"; label: string }
  | { kind: "none" };
