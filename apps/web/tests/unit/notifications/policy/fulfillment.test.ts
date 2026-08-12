import { describe, expect, it } from "vitest";

import { BranchId, EventId, UserId } from "~/domain/ids";
import {
  buildFulfillmentCompletedIntent,
  buildFulfillmentStartedIntent,
  buildFulfillmentStepAdvancedIntent,
  buildFulfillmentStepRejectedIntent,
} from "~/server/notifications/policy/fulfillment";
import type { NotificationPolicyEvent } from "~/server/notifications/policy/types";

const executiveId = UserId.trust("42");
const branchId = BranchId.trust("1");
const ruc = "20123456789";

function fulfillmentEvent(
  overrides: Partial<NotificationPolicyEvent> = {},
): NotificationPolicyEvent {
  return {
    eventId: EventId.trust("evt-1"),
    entityId: "lead-1",
    actorUserId: executiveId,
    subjectUserId: null,
    occurredAt: new Date(0),
    payload: {},
    notificationContext: { ruc, executiveId, branchId },
    ...overrides,
  };
}

describe("buildFulfillmentStartedIntent", () => {
  it("asks the executive to choose the product", () => {
    const intent = buildFulfillmentStartedIntent(fulfillmentEvent());

    expect(intent).toMatchObject({
      eventType: "lead.fulfillment_handoff",
      audience: { kind: "user_ids", userIds: [executiveId] },
      channels: ["in_app"],
      priority: "high",
      title: "Define el producto",
      actionUrl: "/records/lead-1",
    });
  });

  it("ignores events without notification context", () => {
    expect(
      buildFulfillmentStartedIntent(
        fulfillmentEvent({ notificationContext: null }),
      ),
    ).toBeNull();
  });
});

describe("buildFulfillmentStepAdvancedIntent", () => {
  it("sends a ready payment link to the executive", () => {
    const intent = buildFulfillmentStepAdvancedIntent(
      fulfillmentEvent({
        payload: { to: "AWAITING_PAYMENT" },
        notificationContext: {
          ruc,
          executiveId,
          branchId,
          paymentUnits: [
            { label: "POS #1", paymentUrl: "https://pay.example.com/abc" },
          ],
        },
      }),
    );

    expect(intent).toMatchObject({
      eventType: "lead.fulfillment_handoff",
      audience: { kind: "user_ids", userIds: [executiveId] },
      channels: ["in_app", "whatsapp"],
      priority: "high",
      title: "Link de pago listo",
    });

    expect(intent?.bodyText).toContain("https://pay.example.com/abc");
  });

  it("includes every payment unit link", () => {
    const intent = buildFulfillmentStepAdvancedIntent(
      fulfillmentEvent({
        payload: { to: "AWAITING_PAYMENT" },
        notificationContext: {
          ruc,
          executiveId,
          branchId,
          paymentUnits: [
            { label: "POS #1", paymentUrl: "https://pay.example.com/abc" },
            { label: "POS #2", paymentUrl: "https://pay.example.com/def" },
          ],
        },
      }),
    );

    expect(intent?.bodyText).toContain("• POS #1: https://pay.example.com/abc");
    expect(intent?.bodyText).toContain("• POS #2: https://pay.example.com/def");
  });

  it("marks payment units without a link", () => {
    const intent = buildFulfillmentStepAdvancedIntent(
      fulfillmentEvent({
        payload: { to: "AWAITING_PAYMENT" },
        notificationContext: {
          ruc,
          executiveId,
          branchId,
          paymentUnits: [{ label: "POS #1", paymentUrl: null }],
        },
      }),
    );

    expect(intent?.bodyText).toContain("• POS #1: (sin link)");
  });

  it("uses a plain prompt when there are no payment units", () => {
    const intent = buildFulfillmentStepAdvancedIntent(
      fulfillmentEvent({ payload: { to: "AWAITING_PAYMENT" } }),
    );

    expect(intent?.bodyText).toBe(
      `Envía el link de pago al cliente RUC ${ruc} y sube el comprobante.`,
    );
  });

  it("keeps back-office steps in-app", () => {
    const intent = buildFulfillmentStepAdvancedIntent(
      fulfillmentEvent({ payload: { to: "AWAITING_ADDENDUM" } }),
    );

    expect(intent).toMatchObject({
      audience: { kind: "branch_role", branchId, role: "back_office" },
      channels: ["in_app"],
      priority: "normal",
      title: "Genera la adenda",
    });
  });

  it("ignores malformed step payloads", () => {
    expect(
      buildFulfillmentStepAdvancedIntent(
        fulfillmentEvent({ payload: { to: "NOT_A_STEP" } }),
      ),
    ).toBeNull();
  });
});

describe("buildFulfillmentStepRejectedIntent", () => {
  it("sends the rejection reason to the step owner", () => {
    const intent = buildFulfillmentStepRejectedIntent(
      fulfillmentEvent({
        payload: {
          to: "AWAITING_TRANSACTIONS_REPORT",
          reason: "Reporte ilegible",
        },
      }),
    );

    expect(intent).toMatchObject({
      eventType: "lead.fulfillment_handoff",
      audience: { kind: "user_ids", userIds: [executiveId] },
      channels: ["in_app"],
      priority: "high",
      title: "Entrega devuelta",
    });

    expect(intent?.bodyText).toContain("Reporte ilegible");
    expect(intent?.bodyText).toContain(ruc);
  });

  it("ignores malformed rejection payloads", () => {
    expect(
      buildFulfillmentStepRejectedIntent(
        fulfillmentEvent({ payload: { to: "AWAITING_TRANSACTIONS_REPORT" } }),
      ),
    ).toBeNull();
  });
});

describe("buildFulfillmentCompletedIntent", () => {
  it("confirms the sale to the executive", () => {
    const intent = buildFulfillmentCompletedIntent(fulfillmentEvent());

    expect(intent).toMatchObject({
      eventType: "lead.fulfillment_completed",
      audience: { kind: "user_ids", userIds: [executiveId] },
      channels: ["in_app", "whatsapp"],
      priority: "high",
      title: "Venta registrada",
    });

    expect(intent?.bodyText).toContain(ruc);
  });

  it("ignores events without notification context", () => {
    expect(
      buildFulfillmentCompletedIntent(
        fulfillmentEvent({ notificationContext: null }),
      ),
    ).toBeNull();
  });
});
