import CircleQuestionMark from "~/components/icons/circle-question-mark";
import LogOut from "~/components/icons/log-out";
import Package from "~/components/icons/package";
import Settings from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import UserIcon from "~/components/icons/user";

import type { SettingsNavSection } from "./settings-navigation.types";

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
