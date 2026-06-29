import { describe, expect, it, vi } from "vitest";

import { createDeliverySender } from "~/server/notifications/dispatch/send-delivery";
import type {
  DeliveryAttempt,
  DeliveryJob,
} from "~/server/notifications/repos/delivery-repo";

import {
  createScriptedMessagingGateway,
  retryableProviderError,
  terminalProviderError,
} from "../../support/fakes/messaging-gateway";

function emailJob(overrides: Partial<DeliveryJob> = {}): DeliveryJob {
  return {
    id: 1,
    attempt_count: 1,
    max_attempts: 5,
    intent_id: "intent-1",
    user_id: 1,
    channel: "email",
    recipient_address: "user@test.local",
    title: "Title",
    body_text: "Body",
    action_url: null,
    ...overrides,
  };
}

function createSender() {
  const messages = createScriptedMessagingGateway();
  const recorded: Array<{ id: number; attempt: DeliveryAttempt }> = [];
  const sendDelivery = createDeliverySender({
    messaging: messages.gateway,
    deliveries: {
      async recordAttempt(id, attempt) {
        recorded.push({ id, attempt });
      },
    },
    publicOrigin: "https://app.example.test",
    logger: { info: vi.fn() },
  });
  return { messages, recorded, sendDelivery };
}

describe("createDeliverySender", () => {
  it("sends an email and records the provider receipt", async () => {
    const { sendDelivery, recorded, messages } = createSender();

    const outcome = await sendDelivery(emailJob());

    expect(outcome).toEqual({ kind: "sent" });
    expect(messages.campaignEmails).toEqual([
      {
        to: "user@test.local",
        params: { title: "Title", bodyText: "Body", platformName: "Culqi360" },
      },
    ]);
    expect(recorded).toEqual([
      {
        id: 1,
        attempt: {
          provider: "resend",
          provider_message_id: "test-email",
          error_code: null,
          error_message: null,
          latency_ms: null,
        },
      },
    ]);
  });

  it("sends a WhatsApp message and records the provider receipt", async () => {
    const { sendDelivery, recorded, messages } = createSender();

    const outcome = await sendDelivery(
      emailJob({ channel: "whatsapp", recipient_address: "51911000001" }),
    );

    expect(outcome).toEqual({ kind: "sent" });
    expect(messages.whatsAppMessages).toEqual([
      { to: "51911000001", body: "Body" },
    ]);
    expect(recorded[0]?.attempt.provider).toBe("whatsapp_cloud");
  });

  it("classifies a retryable provider error as retry and records the failure", async () => {
    const { sendDelivery, recorded, messages } = createSender();
    messages.scriptWhatsApp(
      retryableProviderError("whatsapp", "whatsapp_cloud"),
    );

    const outcome = await sendDelivery(emailJob({ channel: "whatsapp" }));

    expect(outcome).toEqual({ kind: "retry", reason: "rate limited" });
    expect(recorded[0]?.attempt).toMatchObject({
      provider: "whatsapp_cloud",
      provider_message_id: null,
      error_code: "rate_limited",
      error_message: "rate limited",
    });
  });

  it("classifies a terminal provider error as failed", async () => {
    const { sendDelivery, recorded, messages } = createSender();
    messages.scriptEmail(terminalProviderError("email", "resend"));

    const outcome = await sendDelivery(emailJob());

    expect(outcome).toEqual({ kind: "failed", reason: "permanently rejected" });
    expect(recorded[0]?.attempt.error_code).toBe("bad_request");
  });
});
