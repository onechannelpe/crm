import CircleQuestionMark from "~/components/icons/circle-question-mark";
import LogOut from "~/components/icons/log-out";
import Package from "~/components/icons/package";
import Settings from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import UserIcon from "~/components/icons/user";
import { canAccessPath, type Role } from "~/lib/auth/access/route-policy";

import type { SettingsNavSection } from "./settings-navigation.types";

interface CreateSettingsNavigationSectionsOptions {
  role: Role;
  onLogout: () => void | Promise<void>;
}

export function createSettingsNavigationSections(
  options: CreateSettingsNavigationSectionsOptions,
): SettingsNavSection[] {
  return [
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
          isHidden: !canAccessPath(options.role, "/settings/security"),
          isAdvanced: true,
        },
        {
          id: "login-protection",
          label: "Proteccion de inicio de sesion",
          href: "/settings/login-protection",
          icon: ShieldCheck,
          section: "workspace",
          isHidden: !canAccessPath(options.role, "/settings/login-protection"),
          isAdvanced: true,
        },
        {
          id: "security-policies",
          label: "Politicas de riesgo",
          href: "/settings/security-policies",
          icon: ShieldCheck,
          section: "workspace",
          isHidden: !canAccessPath(options.role, "/settings/security-policies"),
          isAdvanced: true,
        },
        {
          id: "sales-policies",
          label: "Politicas comerciales",
          href: "/settings/capacity-policies",
          icon: Settings,
          section: "workspace",
          isHidden: !canAccessPath(options.role, "/settings/capacity-policies"),
          isAdvanced: true,
        },
        {
          id: "capacity-audit",
          label: "Auditoria de capacidad",
          href: "/settings/capacity-audit",
          icon: Settings,
          section: "workspace",
          isHidden: !canAccessPath(options.role, "/settings/capacity-audit"),
          isAdvanced: true,
        },
        {
          id: "catalog",
          label: "Catalogo",
          href: "/settings/catalog",
          icon: Package,
          section: "workspace",
          isHidden: !canAccessPath(options.role, "/settings/catalog"),
          isAdvanced: true,
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
          onClick: options.onLogout,
        },
      ],
    },
  ];
}
