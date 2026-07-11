import { describe, expect, it, vi } from "vitest";

import { createDeliverySender } from "~/server/notifications/dispatch/send-delivery";
import type { DeliveryJob } from "~/server/notifications/repos/delivery-repo";
import {
  NotificationDeliveryId,
  NotificationIntentId,
  UserId,
} from "~/server/shared/ids";

import {
  createScriptedMessagingGateway,
  retryableProviderError,
  terminalProviderError,
} from "../../support/fakes/messaging-gateway";

function emailJob(overrides: Partial<DeliveryJob> = {}): DeliveryJob {
  return {
    id: NotificationDeliveryId.trust("1"),
    attempt_count: 1,
    max_attempts: 5,
    intent_id: NotificationIntentId.trust("intent-1"),
    user_id: UserId.trust("1"),
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
  const sendDelivery = createDeliverySender({
    messaging: messages.gateway,
    publicOrigin: "https://app.example.test",
    logger: { info: vi.fn<() => void>() },
  });
  return { messages, sendDelivery };
}

describe("createDeliverySender", () => {
  it("returns the provider fields needed to settle a sent email", async () => {
    const { sendDelivery, messages } = createSender();

    const outcome = await sendDelivery(emailJob());

    expect(outcome).toEqual({
      kind: "sent",
      fields: {
        provider: "resend",
        provider_message_id: "test-email",
        error_code: null,
        error_message: null,
      },
    });
    expect(messages.campaignEmails).toEqual([
      {
        to: "user@test.local",
        params: { title: "Title", bodyText: "Body", platformName: "Culqi360" },
      },
    ]);
  });

  it("returns the provider fields needed to settle a sent WhatsApp message", async () => {
    const { sendDelivery, messages } = createSender();

    const outcome = await sendDelivery(
      emailJob({ channel: "whatsapp", recipient_address: "51911000001" }),
    );

    expect(outcome).toEqual({
      kind: "sent",
      fields: {
        provider: "whatsapp_cloud",
        provider_message_id: "test-whatsapp",
        error_code: null,
        error_message: null,
      },
    });
    expect(messages.whatsAppMessages).toEqual([
      { to: "51911000001", body: "Body" },
    ]);
  });

  it("returns retry settlement fields for a retryable provider error", async () => {
    const { sendDelivery, messages } = createSender();
    messages.scriptWhatsApp(
      retryableProviderError("whatsapp", "whatsapp_cloud"),
    );

    const outcome = await sendDelivery(emailJob({ channel: "whatsapp" }));

    expect(outcome).toEqual({
      kind: "retry",
      reason: "rate limited",
      fields: {
        provider: "whatsapp_cloud",
        provider_message_id: null,
        error_code: "rate_limited",
        error_message: "rate limited",
      },
    });
  });

  it("returns failure settlement fields for a terminal provider error", async () => {
    const { sendDelivery, messages } = createSender();
    messages.scriptEmail(terminalProviderError("email", "resend"));

    const outcome = await sendDelivery(emailJob());

    expect(outcome).toEqual({
      kind: "failed",
      reason: "permanently rejected",
      fields: {
        provider: "resend",
        provider_message_id: null,
        error_code: "bad_request",
        error_message: "permanently rejected",
      },
    });
  });
});
