import type { FulfillmentStep } from "~/contracts/workflow/vocabulary";
import { enqueueNotifications } from "~/server/notifications/outbox";
import type {
  NotificationAudience,
  NotificationIntent,
} from "~/server/notifications/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import {
  pendingOwnerForStep,
  type PendingOwner,
} from "~/server/workflow/lead/fulfillment/steps";
import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";

type FulfillmentEvent = Extract<
  CommittedLeadEvent["event"],
  {
    eventType:
      | "fulfillment_started"
      | "fulfillment_step_advanced"
      | "fulfillment_step_rejected"
      | "fulfillment_completed";
  }
>;

function isFulfillmentEvent(
  committed: CommittedLeadEvent,
): committed is { event: FulfillmentEvent; id: string } {
  return (
    committed.event.eventType === "fulfillment_started" ||
    committed.event.eventType === "fulfillment_step_advanced" ||
    committed.event.eventType === "fulfillment_step_rejected" ||
    committed.event.eventType === "fulfillment_completed"
  );
}

// The pending step a committed event leaves the order on. fulfillment_started
// opens the order on CHOOSE_PRODUCT; step-advanced reports its target step.
function targetStep(event: FulfillmentEvent): FulfillmentStep | null {
  if (event.eventType === "fulfillment_started") return "CHOOSE_PRODUCT";
  if (event.eventType === "fulfillment_step_advanced") return event.payload.to;
  return null;
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
    title: "Reporte de transacciones requerido",
    body: (ruc) =>
      `El cliente RUC ${ruc} requiere un producto reacondicionado. Sube el reporte de transacciones.`,
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
  executiveId: number,
  branchId: number | null,
): NotificationAudience | null {
  if (owner === "executive") {
    return { kind: "user_ids", userIds: [executiveId] };
  }
  if (branchId === null) return null;
  if (owner === "supervisor") {
    return { kind: "branch_role", branchId, role: "supervisor" };
  }
  return { kind: "branch_role", branchId, role: "back_office" };
}

export function formatPaymentReadyBody(
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

export function deriveFulfillmentNotification(input: {
  eventId: string;
  event: FulfillmentEvent;
  leadId: string;
  ruc: string;
  executiveId: number;
  branchId: number | null;
  paymentUnits: readonly { label: string; paymentUrl: string | null }[];
}): NotificationIntent[] {
  if (input.event.eventType === "fulfillment_completed") {
    return [
      {
        id: `${input.eventId}:fulfillment_completed`,
        eventType: "lead.fulfillment_completed",
        audience: { kind: "user_ids", userIds: [input.executiveId] },
        // Terminal moment of the funnel for this lead: notify the executive
        // both in-app and via WhatsApp. Planner still gates WA on a verified
        // address and an active Meta session.
        channels: ["in_app", "whatsapp"],
        priority: "high",
        title: "Venta registrada",
        bodyText: `La venta del cliente RUC ${input.ruc} quedó registrada. Cliente activo.`,
        actionUrl: `/records/${input.leadId}`,
      },
    ];
  }

  // The link of payment is ready: this is the step the executive has been
  // waiting for. We promote it to WhatsApp and inline every unit's URL so
  // the executive can copy-paste it to the client without opening the app.
  if (input.event.eventType === "fulfillment_step_advanced") {
    const step = input.event.payload.to;
    if (step === "AWAITING_PAYMENT") {
      const body = formatPaymentReadyBody(input.ruc, input.paymentUnits);
      return [
        {
          id: `${input.eventId}:${step}`,
          eventType: "lead.fulfillment_handoff",
          audience: { kind: "user_ids", userIds: [input.executiveId] },
          // High-value, time-sensitive: surface on both the in-app bell and
          // WhatsApp so the executive can forward the link to the client
          // immediately. Planner still gates WA on a verified address and
          // an active Meta session.
          channels: ["in_app", "whatsapp"],
          priority: "high",
          title: "Link de pago listo",
          bodyText: body,
          actionUrl: `/records/${input.leadId}`,
        },
      ];
    }
  }

  if (input.event.eventType === "fulfillment_step_rejected") {
    const target = input.event.payload.to;
    const owner = pendingOwnerForStep(target);
    if (owner === null) return [];
    const audience = audienceFor(owner, input.executiveId, input.branchId);
    if (audience === null) return [];
    return [
      {
        id: `${input.eventId}:${target}:rejected`,
        eventType: "lead.fulfillment_handoff",
        audience,
        channels: ["in_app"],
        priority: "high",
        title: "Entrega devuelta",
        bodyText: `Cliente RUC ${input.ruc}: ${input.event.payload.reason}`,
        actionUrl: `/records/${input.leadId}`,
      },
    ];
  }

  const step = targetStep(input.event);
  if (step === null) return [];
  const message = STEP_MESSAGE[step];
  const owner = pendingOwnerForStep(step);
  if (message === null || owner === null) return [];

  const audience = audienceFor(owner, input.executiveId, input.branchId);
  if (audience === null) return [];

  return [
    {
      id: `${input.eventId}:${step}`,
      eventType: "lead.fulfillment_handoff",
      audience,
      channels: ["in_app"],
      // Client-facing steps are time-sensitive; back-office work is queue-managed.
      priority: owner === "executive" ? "high" : "normal",
      title: message.title,
      bodyText: message.body(input.ruc),
      actionUrl: `/records/${input.leadId}`,
    },
  ];
}

// Reactor: turns committed fulfillment events into outbox rows aimed at the next
// actor. Runs in the write transaction, same as reactToStageChanges.
export async function reactToFulfillmentChanges(
  tx: DatabaseExecutor,
  committed: CommittedLeadEvent[],
  now: number,
): Promise<void> {
  const events = committed.filter(isFulfillmentEvent);
  if (events.length === 0) return;

  const leadIds = [...new Set(events.map(({ event }) => event.leadId))];
  const leadRows = await tx
    .selectFrom("workflow_leads as lead")
    .innerJoin("organizations as org", "org.id", "lead.organization_id")
    .leftJoin("users as executive", "executive.id", "lead.executive_id")
    .select([
      "lead.id as leadId",
      "org.ruc as ruc",
      "lead.executive_id as executiveId",
      "executive.branch_id as branchId",
    ])
    .where("lead.id", "in", leadIds)
    .execute();
  const leadsById = new Map(leadRows.map((lead) => [lead.leadId, lead]));

  // For the AWAITING_PAYMENT step we inline each unit's payment URL in the
  // notification body, so the executive can forward it to the client without
  // opening the app. Load units only for the orders that need them.
  const paymentOrderIds = [
    ...new Set(
      events
        .filter(
          (ev) =>
            ev.event.eventType === "fulfillment_step_advanced" &&
            ev.event.payload.to === "AWAITING_PAYMENT",
        )
        .map((ev) => ev.event.payload.orderId),
    ),
  ];
  const paymentUnitsByOrderId = new Map<
    string,
    { label: string; paymentUrl: string | null }[]
  >();
  if (paymentOrderIds.length > 0) {
    const unitRows = await tx
      .selectFrom("lead_fulfillment_units")
      .select(["order_id", "label", "payment_url"])
      .where("order_id", "in", paymentOrderIds)
      .orderBy("created_at", "asc")
      .execute();
    for (const row of unitRows) {
      const list = paymentUnitsByOrderId.get(row.order_id) ?? [];
      list.push({ label: row.label, paymentUrl: row.payment_url });
      paymentUnitsByOrderId.set(row.order_id, list);
    }
  }

  const intents: NotificationIntent[] = [];
  for (const { event, id } of events) {
    const lead = leadsById.get(event.leadId);
    if (!lead || lead.executiveId <= 0) continue;

    const paymentUnits =
      event.eventType === "fulfillment_step_advanced" &&
      event.payload.to === "AWAITING_PAYMENT"
        ? (paymentUnitsByOrderId.get(event.payload.orderId) ?? [])
        : [];

    intents.push(
      ...deriveFulfillmentNotification({
        eventId: id,
        event,
        leadId: event.leadId,
        ruc: lead.ruc,
        executiveId: lead.executiveId,
        branchId: lead.branchId,
        paymentUnits,
      }),
    );
  }

  await enqueueNotifications(tx, intents, now);
}
