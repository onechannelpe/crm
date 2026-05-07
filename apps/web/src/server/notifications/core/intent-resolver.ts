import { getNumber, getString, isRecord, safeParseObject } from "./json";
import type {
  Channel,
  DomainEvent,
  NotificationIntent,
  NotificationIntentTarget,
} from "./types";

export function resolveNotificationIntents(
  event: DomainEvent,
): NotificationIntent[] {
  const payload = safeParseObject(event.payload_json);
  const intents: NotificationIntent[] = [];

  const pushIntent = (
    index: number,
    input: Omit<NotificationIntent, "intentId" | "sourceEventId">,
  ) => {
    intents.push({
      intentId: `${event.id}:${index}`,
      sourceEventId: event.id,
      ...input,
    });
  };

  if (event.event_type === "lead.stage_changed") {
    const to = getString(payload, "to");
    const leadId = event.aggregate_id;
    const ruc = getString(payload, "ruc") ?? "";
    const executiveId = getNumber(payload, "executiveId");
    const branchId = getNumber(payload, "branchId");

    if (to === "NEEDS_EXECUTIVE_INPUT" && executiveId !== null) {
      pushIntent(0, {
        audienceKind: "user_ids",
        targets: [{ targetKind: "user_id", userId: executiveId }],
        channels: ["in_app"] satisfies Channel[],
        eventType: "lead.needs_executive_input",
        priority: "high",
        title: "Accion requerida",
        bodyText: `El prospecto RUC ${ruc} requiere tu informacion comercial`,
        actionUrl: "/records",
      });
    }

    if (to === "READY_FOR_QUOTATION" && branchId !== null) {
      pushIntent(0, {
        audienceKind: "branch_roles",
        targets: [
          {
            targetKind: "branch_role",
            branchId,
            role: "back_office",
          },
        ] satisfies NotificationIntentTarget[],
        channels: ["in_app"] satisfies Channel[],
        eventType: "lead.ready_for_quotation",
        priority: "normal",
        title: "Prospecto listo para cotizacion",
        bodyText: `El prospecto RUC ${ruc} esta listo para cotizar`,
        actionUrl: `/records/${leadId}`,
      });
    }

    if (to === "READY_FOR_SALE" && executiveId !== null) {
      pushIntent(0, {
        audienceKind: "user_ids",
        targets: [{ targetKind: "user_id", userId: executiveId }],
        channels: ["in_app"] satisfies Channel[],
        eventType: "lead.ready_for_sale",
        priority: "high",
        title: "Prospecto listo para venta",
        bodyText: `El prospecto RUC ${ruc} fue aprobado. Puedes registrar la venta.`,
        actionUrl: `/records/${leadId}`,
      });
    }
  }

  if (event.event_type === "security.privileged_login") {
    const audience = payload?.audience;
    const userIds =
      audience &&
      typeof audience === "object" &&
      Array.isArray((audience as Record<string, unknown>).user_ids)
        ? ((audience as Record<string, unknown>).user_ids as unknown[]).filter(
            (value): value is number => typeof value === "number",
          )
        : [];
    const userId = userIds[0] ?? null;
    if (userId !== null) {
      pushIntent(0, {
        audienceKind: "user_ids",
        targets: [{ targetKind: "user_id", userId }],
        channels: ["in_app", "email", "whatsapp"] satisfies Channel[],
        eventType: "security.privileged_login",
        priority: "high",
        title: getString(payload, "title") ?? "Security alert",
        bodyText:
          getString(payload, "bodyText") ?? "Privileged login detected.",
        actionUrl: null,
      });
    }
  }

  if (event.event_type === "broadcast.general") {
    const audienceKind = getString(payload, "audienceKind");
    const audience = payload?.audience;
    if (
      (audienceKind === "user_ids" ||
        audienceKind === "branch_roles" ||
        audienceKind === "global_roles" ||
        audienceKind === "team") &&
      isRecord(audience)
    ) {
      pushIntent(0, {
        audienceKind,
        targets: deriveTargetsFromAudience(audienceKind, audience),
        channels: ["in_app", "email", "whatsapp"] satisfies Channel[],
        eventType: "broadcast.general",
        priority: "normal",
        title: getString(payload, "title") ?? "Broadcast",
        bodyText: getString(payload, "bodyText") ?? "",
        actionUrl: null,
      });
    }
  }

  return intents;
}

function deriveTargetsFromAudience(
  audienceKind: "user_ids" | "branch_roles" | "global_roles" | "team",
  audience: Record<string, unknown>,
): NotificationIntentTarget[] {
  if (audienceKind === "user_ids") {
    const userIds = Array.isArray(audience.user_ids)
      ? audience.user_ids.filter(
          (value): value is number => typeof value === "number",
        )
      : [];
    return userIds.map((userId) => ({ targetKind: "user_id", userId }));
  }
  if (audienceKind === "branch_roles") {
    const branchId =
      typeof audience.branch_id === "number" ? audience.branch_id : null;
    const roles = Array.isArray(audience.branch_roles)
      ? audience.branch_roles.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
    if (branchId === null) return [];
    return roles.map((role) => ({ targetKind: "branch_role", branchId, role }));
  }
  if (audienceKind === "global_roles") {
    const roles = Array.isArray(audience.global_roles)
      ? audience.global_roles.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
    return roles.map((role) => ({ targetKind: "global_role", role }));
  }
  const teamId = typeof audience.team_id === "number" ? audience.team_id : null;
  if (teamId === null) return [];
  return [{ targetKind: "team_id", teamId }];
}
