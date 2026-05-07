export type PublicMenuItem = {
  href: string;
  label: string;
};

export type PublicSocialLink = {
  href: string;
  icon: "github" | "discord";
  label?: string;
};

export const PUBLIC_MENU_ITEMS: PublicMenuItem[] = [
  { href: "/docs", label: "Docs" },
  { href: "/releases", label: "Releases" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
];

export const PUBLIC_SOCIAL_LINKS: PublicSocialLink[] = [
  { href: "https://github.com/onechannelpe/crm", icon: "github" },
];
