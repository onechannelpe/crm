import Activity from "~/components/icons/activity";
import Bell from "~/components/icons/bell";
import ColorSwatch from "~/components/icons/color-swatch";
import DoorEnter from "~/components/icons/door-enter";
import HelpCircle from "~/components/icons/help-circle";
import Settings from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import UploadCloud from "~/components/icons/upload-cloud";
import UserCircle from "~/components/icons/user-circle";
import Users from "~/components/icons/users";
import { canAccessPath, type Role } from "~/domain/auth/access/route-policy";

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
          icon: UserCircle,
          section: "account",
        },
        {
          id: "appearance",
          label: "Apariencia",
          href: "/settings/appearance",
          icon: ColorSwatch,
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
          label: "Políticas comerciales",
          href: "/settings/capacity-policies",
          icon: Settings,
          section: "operations",
          isHidden: !canAccessPath(options.role, "/settings/capacity-policies"),
        },
        {
          id: "quotation-policies",
          label: "Políticas de cotización",
          href: "/settings/quotation-policies",
          icon: Settings,
          section: "operations",
          isHidden: !canAccessPath(
            options.role,
            "/settings/quotation-policies",
          ),
        },
        {
          id: "commission-scheme",
          label: "Esquema de comisiones",
          href: "/settings/commission-scheme",
          icon: Settings,
          section: "operations",
          isHidden: !canAccessPath(options.role, "/settings/commission-scheme"),
        },
      ],
    },
    {
      id: "administration",
      label: "Administración",
      items: [
        {
          id: "members",
          label: "Miembros",
          href: "/settings/members",
          icon: Users,
          section: "administration",
          matchSubPages: true,
          isHidden: !canAccessPath(options.role, "/settings/members"),
        },
        {
          id: "login-protection",
          label: "Protección de inicio de sesión",
          href: "/settings/login-protection",
          icon: ShieldCheck,
          section: "administration",
          isHidden: !canAccessPath(options.role, "/settings/login-protection"),
          isAdvanced: true,
        },
        {
          id: "security-policies",
          label: "Políticas de riesgo",
          href: "/settings/security-policies",
          icon: ShieldCheck,
          section: "administration",
          isHidden: !canAccessPath(options.role, "/settings/security-policies"),
          isAdvanced: true,
        },
        {
          id: "event-logs",
          label: "Registro de eventos",
          href: "/settings/event-logs",
          icon: Activity,
          section: "administration",
          isHidden: !canAccessPath(options.role, "/settings/event-logs"),
          isAdvanced: true,
        },
        {
          id: "data-sources",
          label: "Fuentes de datos",
          href: "/settings/data-sources",
          icon: UploadCloud,
          section: "administration",
          isHidden: !canAccessPath(options.role, "/settings/data-sources"),
          isAdvanced: true,
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
          icon: HelpCircle,
          section: "other",
        },
        {
          id: "logout",
          label: "Cerrar sesión",
          icon: DoorEnter,
          section: "other",
          onClick: options.onLogout,
        },
      ],
    },
  ];
}
