import type { NotificationChannel } from "./types";

export const NOTIFICATION_CATEGORIES = [
  "lead_handoffs",
  "fulfillment",
  "security",
  "broadcasts",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

// Only email and whatsapp are user-controllable; in_app is the bell and is
// always delivered.
export type ExternalChannel = Exclude<NotificationChannel, "in_app">;

export const EXTERNAL_CHANNELS = [
  "email",
  "whatsapp",
] as const satisfies readonly ExternalChannel[];

export const EVENT_CATEGORY = {
  "lead.ready_for_quotation": "lead_handoffs",
  "lead.ready_for_sale": "lead_handoffs",
  "lead.fulfillment_handoff": "fulfillment",
  "lead.fulfillment_completed": "fulfillment",
  "security.privileged_login": "security",
  "broadcast.general": "broadcasts",
} as const satisfies Record<string, NotificationCategory>;

export type NotificationEventType = keyof typeof EVENT_CATEGORY;

export const CATEGORY_META = {
  lead_handoffs: {
    label: "Traspasos de leads",
    description: "Cuando un cliente queda listo para tarifa o afiliación.",
    controllableChannels: EXTERNAL_CHANNELS,
  },
  fulfillment: {
    label: "Tareas de entrega",
    description: "Pasos de la entrega que requieren tu acción.",
    controllableChannels: EXTERNAL_CHANNELS,
  },
  security: {
    label: "Alertas de seguridad",
    description: "Inicios de sesión privilegiados. No se pueden desactivar.",
    controllableChannels: [],
  },
  broadcasts: {
    label: "Comunicados",
    description: "Anuncios generales de la plataforma.",
    controllableChannels: EXTERNAL_CHANNELS,
  },
} as const satisfies Record<
  NotificationCategory,
  {
    label: string;
    description: string;
    controllableChannels: readonly ExternalChannel[];
  }
>;

export function resolveCategory(
  eventType: string,
): NotificationCategory | null {
  return (
    (EVENT_CATEGORY as Record<string, NotificationCategory | undefined>)[
      eventType
    ] ?? null
  );
}

export function isChannelControllable(
  category: NotificationCategory,
  channel: ExternalChannel,
): boolean {
  return (
    CATEGORY_META[category].controllableChannels as readonly ExternalChannel[]
  ).includes(channel);
}

// Used by the WhatsApp STOP command to opt the user out of every
// whatsapp-controllable category at once.
export function categoriesControllableOn(
  channel: ExternalChannel,
): NotificationCategory[] {
  return NOTIFICATION_CATEGORIES.filter((category) =>
    isChannelControllable(category, channel),
  );
}
