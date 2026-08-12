import {
  FULFILLMENT_STEPS,
  type FulfillmentStep,
} from "~/contracts/workflow/vocabulary";
import { NotificationIntentId, type BranchId, type UserId } from "~/domain/ids";
import {
  pendingOwnerForStep,
  type PendingOwner,
} from "~/server/workflow/lead/fulfillment/steps";
import { isPlainRecord } from "~/shared/type-guards";

import type { NotificationAudience, NotificationIntent } from "../types";
import { isLeadNotificationContext } from "./lead-notification-context";
import type { NotificationPolicyEvent } from "./types";

function isFulfillmentStep(value: unknown): value is FulfillmentStep {
  return (
    typeof value === "string" &&
    (FULFILLMENT_STEPS as readonly string[]).includes(value)
  );
}

const STEP_MESSAGE: Record<
  FulfillmentStep,
  { title: string; body: (ruc: string) => string } | null
> = {
  CHOOSE_PRODUCT: {
    title: "Define el producto",
    body: (ruc) =>
      `Elige el producto del cliente RUC ${ruc} para iniciar la entrega.`,
  },
  AWAITING_TRANSACTIONS_REPORT: {
    title: "Sube el reporte de transacciones",
    body: (ruc) =>
      `El cliente RUC ${ruc} requiere un producto reacondicionado. Sube el reporte de transacciones para que back office genere la adenda.`,
  },
  AWAITING_ADDENDUM: {
    title: "Genera la adenda",
    body: (ruc) => `Genera y sube la adenda del cliente RUC ${ruc}.`,
  },
  AWAITING_SIGNATURE: {
    title: "Adenda lista para firma",
    body: (ruc) =>
      `Envía la adenda al cliente RUC ${ruc} para firma y sube las fotos firmadas.`,
  },
  AWAITING_PDF_COMPILE: {
    title: "Compila la adenda firmada",
    body: (ruc) =>
      `Compila la adenda firmada del cliente RUC ${ruc} en un PDF.`,
  },
  AWAITING_SERIALS: {
    title: "Registra los seriales",
    body: (ruc) => `Registra los seriales del POS del cliente RUC ${ruc}.`,
  },
  AWAITING_SERIAL_ENTRY: {
    title: "Envía el serial del POS",
    body: (ruc) => `Envía el serial del POS nuevo del cliente RUC ${ruc}.`,
  },
  AWAITING_PAYMENT_LINK: {
    title: "Genera el link de pago",
    body: (ruc) =>
      `Registra el equipo del cliente RUC ${ruc} y genera el link de pago.`,
  },
  AWAITING_PAYMENT: {
    title: "Link de pago listo",
    body: (ruc) =>
      `Envía el link de pago al cliente RUC ${ruc} y sube el comprobante.`,
  },
  AWAITING_PAYMENT_VALIDATION: {
    title: "Valida el comprobante de pago",
    body: (ruc) =>
      `Revisa y valida el comprobante de pago del cliente RUC ${ruc}.`,
  },
  AWAITING_SALE_REGISTRATION: {
    title: "Registra la venta",
    body: (ruc) =>
      `Registra la venta del cliente RUC ${ruc} en la plataforma de Culqi.`,
  },
  COMPLETED: null,
};

function audienceFor(
  owner: PendingOwner,
  executiveId: UserId,
  branchId: BranchId,
): NotificationAudience {
  if (owner === "executive") {
    return { kind: "user_ids", userIds: [executiveId] };
  }
  return { kind: "branch_role", branchId, role: "back_office" };
}

function formatPaymentReadyBody(
  ruc: string,
  units: readonly { label: string; paymentUrl: string | null }[],
): string {
  if (units.length === 0) {
    return `Envía el link de pago al cliente RUC ${ruc} y sube el comprobante.`;
  }
  const lines = units
    .map((unit) => `• ${unit.label}: ${unit.paymentUrl ?? "(sin link)"}`)
    .join("\n");
  return `Link(s) de pago listos para el cliente RUC ${ruc}:\n${lines}\nEnvíalo(s) al cliente y sube el comprobante.`;
}

function stepIntent(input: {
  eventId: string;
  entityId: string;
  step: FulfillmentStep;
  ruc: string;
  executiveId: UserId;
  branchId: BranchId;
}): NotificationIntent | null {
  const message = STEP_MESSAGE[input.step];
  const owner = pendingOwnerForStep(input.step);
  if (message === null || owner === null) {
    return null;
  }

  return {
    id: NotificationIntentId.derive({
      sourceEventId: input.eventId,
      discriminator: input.step,
    }),
    eventType: "lead.fulfillment_handoff",
    audience: audienceFor(owner, input.executiveId, input.branchId),
    channels: ["in_app"],
    // Client-facing steps block the client on a reply: high priority.
    // Back-office work sits in a queue: normal.
    priority: owner === "executive" ? "high" : "normal",
    title: message.title,
    bodyText: message.body(input.ruc),
    actionUrl: `/records/${input.entityId}`,
  };
}

// fulfillment_started always opens the order on CHOOSE_PRODUCT.
export function buildFulfillmentStartedIntent(
  event: NotificationPolicyEvent,
): NotificationIntent | null {
  if (!isLeadNotificationContext(event.notificationContext)) {
    return null;
  }
  const ctx = event.notificationContext;

  return stepIntent({
    eventId: event.eventId,
    entityId: event.entityId,
    step: "CHOOSE_PRODUCT",
    ruc: ctx.ruc,
    executiveId: ctx.executiveId,
    branchId: ctx.branchId,
  });
}

function isStepAdvancedPayload(
  value: unknown,
): value is { to: FulfillmentStep } {
  return isPlainRecord(value) && isFulfillmentStep(value["to"]);
}

export function buildFulfillmentStepAdvancedIntent(
  event: NotificationPolicyEvent,
): NotificationIntent | null {
  if (
    !isStepAdvancedPayload(event.payload) ||
    !isLeadNotificationContext(event.notificationContext)
  ) {
    return null;
  }

  const { to: step } = event.payload;
  const ctx = event.notificationContext;

  // The link(s) become the notification body itself, so this step gets its
  // own eventType/copy instead of the generic per-step message.
  if (step === "AWAITING_PAYMENT") {
    return {
      id: NotificationIntentId.derive({
        sourceEventId: event.eventId,
        discriminator: step,
      }),
      eventType: "lead.fulfillment_handoff",
      audience: { kind: "user_ids", userIds: [ctx.executiveId] },
      channels: ["in_app", "whatsapp"],
      priority: "high",
      title: "Link de pago listo",
      bodyText: formatPaymentReadyBody(ctx.ruc, ctx.paymentUnits ?? []),
      actionUrl: `/records/${event.entityId}`,
    };
  }

  return stepIntent({
    eventId: event.eventId,
    entityId: event.entityId,
    step,
    ruc: ctx.ruc,
    executiveId: ctx.executiveId,
    branchId: ctx.branchId,
  });
}

function isStepRejectedPayload(
  value: unknown,
): value is { to: FulfillmentStep; reason: string } {
  return (
    isPlainRecord(value) &&
    isFulfillmentStep(value["to"]) &&
    typeof value["reason"] === "string"
  );
}

export function buildFulfillmentStepRejectedIntent(
  event: NotificationPolicyEvent,
): NotificationIntent | null {
  if (
    !isStepRejectedPayload(event.payload) ||
    !isLeadNotificationContext(event.notificationContext)
  ) {
    return null;
  }

  const { to: target, reason } = event.payload;
  const ctx = event.notificationContext;
  const owner = pendingOwnerForStep(target);
  if (owner === null) {
    return null;
  }

  return {
    id: NotificationIntentId.derive({
      sourceEventId: event.eventId,
      discriminator: `${target}:rejected`,
    }),
    eventType: "lead.fulfillment_handoff",
    audience: audienceFor(owner, ctx.executiveId, ctx.branchId),
    channels: ["in_app"],
    priority: "high",
    title: "Entrega devuelta",
    bodyText: `Cliente RUC ${ctx.ruc}: ${reason}`,
    actionUrl: `/records/${event.entityId}`,
  };
}

export function buildFulfillmentCompletedIntent(
  event: NotificationPolicyEvent,
): NotificationIntent | null {
  if (!isLeadNotificationContext(event.notificationContext)) {
    return null;
  }
  const ctx = event.notificationContext;

  return {
    id: NotificationIntentId.derive({
      sourceEventId: event.eventId,
      discriminator: "fulfillment_completed",
    }),
    eventType: "lead.fulfillment_completed",
    audience: { kind: "user_ids", userIds: [ctx.executiveId] },
    // Terminal funnel moment: whatsapp confirms the sale without requiring
    // the executive to open the app.
    channels: ["in_app", "whatsapp"],
    priority: "high",
    title: "Venta registrada",
    bodyText: `La venta del cliente RUC ${ctx.ruc} quedó registrada. Cliente activo.`,
    actionUrl: `/records/${event.entityId}`,
  };
}
