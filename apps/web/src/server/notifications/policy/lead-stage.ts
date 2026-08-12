import { LEAD_STAGES, type LeadStage } from "~/contracts/workflow/vocabulary";
import { NotificationIntentId } from "~/domain/ids";
import { isPlainRecord } from "~/shared/type-guards";

import type { NotificationIntent } from "../types";
import { isLeadNotificationContext } from "./lead-notification-context";
import type { NotificationPolicyEvent } from "./types";

function isLeadStage(value: unknown): value is LeadStage {
  return (
    typeof value === "string" &&
    (LEAD_STAGES as readonly string[]).includes(value)
  );
}

function isStageChangedPayload(value: unknown): value is { to: LeadStage } {
  return isPlainRecord(value) && isLeadStage(value["to"]);
}

// Availability qualification cleared the lead (-> PRICING): back office now
// proposes a rate. The executive accepted the rate (-> SETUP): time to set
// up the affiliation. Every other stage transition is audit-only.
export function buildLeadStageIntent(
  event: NotificationPolicyEvent,
): NotificationIntent | null {
  if (
    !isStageChangedPayload(event.payload) ||
    !isLeadNotificationContext(event.notificationContext)
  ) {
    return null;
  }

  const { to } = event.payload;
  const ctx = event.notificationContext;

  if (to === "PRICING") {
    return {
      id: NotificationIntentId.derive({
        sourceEventId: event.eventId,
        discriminator: "ready_pricing",
      }),
      eventType: "lead.ready_for_quotation",
      audience: {
        kind: "branch_role",
        branchId: ctx.branchId,
        role: "back_office",
      },
      channels: ["in_app"],
      priority: "normal",
      title: "Cliente listo para tarifa",
      bodyText: `El cliente RUC ${ctx.ruc} está listo para proponer tarifa`,
      actionUrl: `/records/${event.entityId}`,
    };
  }

  if (to === "SETUP") {
    return {
      id: NotificationIntentId.derive({
        sourceEventId: event.eventId,
        discriminator: "ready_setup",
      }),
      eventType: "lead.ready_for_sale",
      audience: { kind: "user_ids", userIds: [ctx.executiveId] },
      // The in-app bell alone would miss executives who don't open the app;
      // whatsapp reaches them on their primary channel for a high-value step.
      channels: ["in_app", "whatsapp"],
      priority: "high",
      title: "Cliente listo para afiliación",
      bodyText: `El cliente RUC ${ctx.ruc} aceptó la tarifa. Define la política digital para continuar.`,
      actionUrl: `/records/${event.entityId}`,
    };
  }

  return null;
}
