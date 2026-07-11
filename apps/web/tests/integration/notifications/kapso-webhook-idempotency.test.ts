import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const state = vi.hoisted(() => ({
  runtime: undefined as
    | undefined
    | {
        ctx: { db: unknown };
        now: { get: () => Date };
      },
}));

vi.mock("~/server/platform/container", () => ({
  getServerRuntime: () => {
    if (!state.runtime) throw new Error("test runtime not installed");
    return {
      infra: {
        db: state.runtime.ctx.db,
        now: state.runtime.now.get,
      },
    };
  },
}));

import { POST } from "~/routes/api/webhooks/whatsapp";

const NOW = new Date("2026-01-02T03:04:05.000Z");
const INBOUND_EVENT = "whatsapp.message.received";
const PAYLOAD_VERSION = "v2";

function kapsoRequest(idempotencyKey: string, messageId: string): Request {
  return new Request("http://localhost/api/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "x-idempotency-key": idempotencyKey,
      "x-webhook-event": INBOUND_EVENT,
      "x-webhook-payload-version": PAYLOAD_VERSION,
    },
    body: JSON.stringify({
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
  });
}

async function postWebhook(idempotencyKey: string, messageId: string) {
  return POST({ request: kapsoRequest(idempotencyKey, messageId) });
}

describe("kapso webhook idempotency", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("kapso-webhook-idempotency");
    state.runtime = runtime;
  });

  afterAll(async () => {
    state.runtime = undefined;
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(NOW);
  });

  it("deduplicates provider retries and batch fallback redelivery", async () => {
    const messageId = "wamid.same-message";

    await expect(postWebhook("delivery-1", messageId)).resolves.toMatchObject({
      status: 200,
    });
    await expect(postWebhook("delivery-1", messageId)).resolves.toMatchObject({
      status: 200,
    });
    await expect(postWebhook("delivery-2", messageId)).resolves.toMatchObject({
      status: 200,
    });

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
