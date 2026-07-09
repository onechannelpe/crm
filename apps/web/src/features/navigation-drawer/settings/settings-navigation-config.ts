import Bell from "~/components/icons/bell";
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
      id: "account",
      label: "Cuenta",
      items: [
        {
          id: "profile",
          label: "Perfil",
          href: "/settings/profile",
          icon: UserIcon,
          section: "account",
        },
        {
          id: "notifications",
          label: "Notificaciones",
          href: "/settings/notifications",
          icon: Bell,
          section: "account",
        },
        {
          id: "security",
          label: "Seguridad",
          href: "/settings/security",
          icon: ShieldCheck,
          section: "account",
          isHidden: !canAccessPath(options.role, "/settings/security"),
        },
      ],
    },
    {
      id: "operations",
      label: "Operación",
      items: [
        {
          id: "sales-policies",
          label: "Politicas comerciales",
          href: "/settings/capacity-policies",
          icon: Settings,
          section: "operations",
          isHidden: !canAccessPath(options.role, "/settings/capacity-policies"),
        },
        {
          id: "quotation-policies",
          label: "Politicas de cotizacion",
          href: "/settings/quotation-policies",
          icon: Settings,
          section: "operations",
          isHidden: !canAccessPath(
            options.role,
            "/settings/quotation-policies",
          ),
        },
        {
          id: "capacity-audit",
          label: "Auditoria de capacidad",
          href: "/settings/capacity-audit",
          icon: Settings,
          section: "operations",
          isHidden: !canAccessPath(options.role, "/settings/capacity-audit"),
        },
      ],
    },
    {
      id: "administration",
      label: "Administración",
      items: [
        {
          id: "login-protection",
          label: "Proteccion de inicio de sesion",
          href: "/settings/login-protection",
          icon: ShieldCheck,
          section: "administration",
          isHidden: !canAccessPath(options.role, "/settings/login-protection"),
          isAdvanced: true,
        },
        {
          id: "security-policies",
          label: "Politicas de riesgo",
          href: "/settings/security-policies",
          icon: ShieldCheck,
          section: "administration",
          isHidden: !canAccessPath(options.role, "/settings/security-policies"),
          isAdvanced: true,
        },
        {
          id: "catalog",
          label: "Catalogo",
          href: "/settings/catalog",
          icon: Package,
          section: "administration",
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
          label: "Centro de ayuda",
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
