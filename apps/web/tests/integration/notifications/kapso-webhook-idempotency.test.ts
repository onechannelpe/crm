import { createTestNotificationRuntime } from "@tests/support/integration/notification-runtime";
import { operationAt } from "@tests/support/operation";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const NOW = new Date("2026-01-02T03:04:05.000Z");
const INBOUND_EVENT = "whatsapp.message.received";
const PAYLOAD_VERSION = "v2";

function kapsoWebhook(idempotencyKey: string, messageId: string) {
  return {
    idempotencyKey,
    eventType: INBOUND_EVENT,
    payloadVersion: PAYLOAD_VERSION,
    rawBody: JSON.stringify({
      phone_number_id: "phone-number-1",
      conversation: {
        id: "conversation-1",
        phone_number: "51987654321",
      },
      message: {
        id: messageId,
        timestamp: "1767225600",
        text: { body: "VERIFICAR" },
        kapso: {
          direction: "inbound",
          phone_number_id: "phone-number-1",
        },
      },
    }),
  };
}

describe("kapso webhook idempotency", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("kapso-webhook-idempotency");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(NOW);
  });

  it("deduplicates provider retries and batch fallback redelivery", async () => {
    const messageId = "wamid.same-message";
    const notifications = createTestNotificationRuntime(runtime);

    expect(
      await notifications.webhooks.receiveKapso(
        kapsoWebhook("delivery-1", messageId),
        operationAt(NOW),
      ),
    ).toMatchObject({ ok: true });
    expect(
      await notifications.webhooks.receiveKapso(
        kapsoWebhook("delivery-1", messageId),
        operationAt(NOW),
      ),
    ).toMatchObject({ ok: true });
    expect(
      await notifications.webhooks.receiveKapso(
        kapsoWebhook("delivery-2", messageId),
        operationAt(NOW),
      ),
    ).toMatchObject({ ok: true });

    const deliveries = await runtime.ctx.db
      .selectFrom("kapso_webhook_deliveries")
      .select(["idempotency_key"])
      .where("idempotency_key", "in", ["delivery-1", "delivery-2"])
      .orderBy("idempotency_key")
      .execute();
    expect(deliveries.map((row) => row.idempotency_key)).toEqual([
      "delivery-1",
      "delivery-2",
    ]);

    const events = await runtime.ctx.db
      .selectFrom("whatsapp_inbound_events")
      .select(["id", "delivery_key", "queue_state"])
      .where("id", "=", messageId)
      .execute();
    expect(events).toEqual([
      {
        id: messageId,
        delivery_key: "delivery-1",
        queue_state: "pending",
      },
    ]);
  });
});
