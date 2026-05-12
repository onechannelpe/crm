export type PublicMenuItem = {
  href: string;
  label: string;
};

export const PUBLIC_MENU_ITEMS: PublicMenuItem[] = [
  { href: "/docs", label: "Guías" },
  { href: "/updates", label: "Changelog" },
  { href: "/legal/privacy", label: "Privacidad" },
  { href: "/legal/terms", label: "Términos" },
];
