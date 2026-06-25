import { describe, expect, it } from "vitest";

import type { FulfillmentStep } from "~/contracts/workflow/vocabulary";
import {
  deriveFulfillmentNotification,
  formatPaymentReadyBody,
} from "~/server/workflow/effects/reactors/fulfillment-notify";

const baseInput = {
  eventId: "evt-1",
  leadId: "lead-1",
  ruc: "20123456789",
  executiveId: 42,
  branchId: 1,
  paymentUnits: [] as { label: string; paymentUrl: string | null }[],
} as const;

function stepAdvanced(to: FulfillmentStep) {
  return {
    eventType: "fulfillment_step_advanced" as const,
    leadId: "lead-1",
    actorUserId: 1,
    subjectUserId: null,
    payload: {
      orderId: "order-1",
      from: "AWAITING_PAYMENT_LINK" as const,
      to,
      action: "upload_payment_proof" as const,
    },
    changes: [] as never[],
    occurredAt: 0,
  };
}

describe("formatPaymentReadyBody", () => {
  it("falls back to a plain prompt when no units are available", () => {
    const text = formatPaymentReadyBody("20123456789", []);
    expect(text).toBe(
      "Envía el link de pago al cliente RUC 20123456789 y sube el comprobante.",
    );
  });

  it("lists one URL per unit with its label", () => {
    const text = formatPaymentReadyBody("20123456789", [
      { label: "POS #1", paymentUrl: "https://pay.example.com/abc" },
    ]);
    expect(text).toContain("RUC 20123456789");
    expect(text).toContain("• POS #1: https://pay.example.com/abc");
  });

  it("handles multiple units in the same order", () => {
    const text = formatPaymentReadyBody("20123456789", [
      { label: "POS #1", paymentUrl: "https://pay.example.com/abc" },
      { label: "POS #2", paymentUrl: "https://pay.example.com/def" },
    ]);
    expect(text).toContain("Link(s) de pago listos");
    expect(text).toContain("• POS #1: https://pay.example.com/abc");
    expect(text).toContain("• POS #2: https://pay.example.com/def");
  });

  it("marks units without a URL so the executive notices the gap", () => {
    const text = formatPaymentReadyBody("20123456789", [
      { label: "POS #1", paymentUrl: null },
    ]);
    expect(text).toContain("• POS #1: (sin link)");
  });
});

describe("deriveFulfillmentNotification: AWAITING_PAYMENT step", () => {
  it("emits an in-app + WhatsApp intent with the payment URL inlined", () => {
    const intents = deriveFulfillmentNotification({
      ...baseInput,
      event: stepAdvanced("AWAITING_PAYMENT"),
      paymentUnits: [
        { label: "POS #1", paymentUrl: "https://pay.example.com/abc" },
      ],
    });

    expect(intents).toHaveLength(1);
    const [intent] = intents;
    if (!intent) throw new Error("expected one intent");

    expect(intent.eventType).toBe("lead.fulfillment_handoff");
    expect(intent.audience).toEqual({ kind: "user_ids", userIds: [42] });
    expect(intent.channels).toEqual(["in_app", "whatsapp"]);
    expect(intent.priority).toBe("high");
    expect(intent.title).toBe("Link de pago listo");
    expect(intent.bodyText).toContain("https://pay.example.com/abc");
    expect(intent.bodyText).toContain("RUC 20123456789");
    expect(intent.actionUrl).toBe("/records/lead-1");
  });

  it("uses the fallback body when no payment units are attached", () => {
    const intents = deriveFulfillmentNotification({
      ...baseInput,
      event: stepAdvanced("AWAITING_PAYMENT"),
      paymentUnits: [],
    });

    expect(intents).toHaveLength(1);
    const [intent] = intents;
    if (!intent) throw new Error("expected one intent");
    expect(intent.bodyText).toBe(
      "Envía el link de pago al cliente RUC 20123456789 y sube el comprobante.",
    );
    expect(intent.channels).toEqual(["in_app", "whatsapp"]);
  });

  it("does not promote unrelated step advances to WhatsApp", () => {
    // AWAITING_PAYMENT_LINK is back-office work, not executive-facing.
    const intents = deriveFulfillmentNotification({
      ...baseInput,
      event: stepAdvanced("AWAITING_PAYMENT_LINK"),
      paymentUnits: [],
    });

    expect(intents).toHaveLength(1);
    const [intent] = intents;
    if (!intent) throw new Error("expected one intent");
    expect(intent.channels).toEqual(["in_app"]);
  });
});
