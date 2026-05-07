export type PublicMenuItem = {
  href: string;
  label: string;
};

export const PUBLIC_MENU_ITEMS: PublicMenuItem[] = [
  { href: "/docs", label: "Docs" },
  { href: "/updates", label: "Updates" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
];
