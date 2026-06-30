import { aDeliveryRow } from "@tests/support/builders/notifications";
import {
  okReceipt,
  retryableProviderError,
  terminalProviderError,
} from "@tests/support/fakes/messaging-gateway";
import { createTestNotificationRuntime } from "@tests/support/integration/notification-runtime";
import { createNotificationReader } from "@tests/support/readers/notifications";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { NotificationIntent } from "~/server/notifications/types";
import { openSession } from "~/server/notifications/whatsapp-session";

const NOW = 1_700_000_000_000;

describe("notification delivery dispatch", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("notification-delivery-dispatch");
    runtime.now.set(NOW);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  async function giveAddresses(userId: number, withSession: boolean) {
    await runtime.ctx.repos.userChannelAddresses.upsert({
      user_id: userId,
      channel: "email",
      address: `user-${userId}@test.local`,
      is_verified: 1,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });
    await runtime.ctx.repos.userChannelAddresses.upsert({
      user_id: userId,
      channel: "whatsapp",
      address: `5191100000${userId}`,
      is_verified: 1,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });
    if (withSession) await openSession(runtime.ctx.db, userId, NOW);
  }

  function intent(overrides: Partial<NotificationIntent>): NotificationIntent {
    return {
      id: "intent-1",
      eventType: "lead.ready",
      audience: { kind: "user_ids", userIds: [1] },
      channels: ["whatsapp"],
      priority: "normal",
      title: "Title",
      bodyText: "Body",
      actionUrl: null,
      ...overrides,
    };
  }

  it("fans out one delivery per recipient per external channel", async () => {
    await giveAddresses(1, true);
    await giveAddresses(2, true);
    const notifications = createTestNotificationRuntime(runtime);

    await notifications.enqueue([
      intent({
        audience: { kind: "user_ids", userIds: [1, 2] },
        channels: ["in_app", "email", "whatsapp"],
      }),
    ]);
    await notifications.drain();

    const reader = createNotificationReader(runtime);
    expect(await reader.appNotifications()).toHaveLength(2);

    const deliveries = await reader.deliveries();
    expect(deliveries).toHaveLength(4);
    expect(deliveries.every((d) => d.queue_state === "done")).toBe(true);
    expect(deliveries.map((d) => `${d.user_id}:${d.channel}`).sort()).toEqual([
      "1:email",
      "1:whatsapp",
      "2:email",
      "2:whatsapp",
    ]);
  });

  it("skips a WhatsApp recipient without an active session but still writes in-app", async () => {
    await giveAddresses(1, true);
    await giveAddresses(2, false); // verified address, no session
    const notifications = createTestNotificationRuntime(runtime);

    await notifications.enqueue([
      intent({
        audience: { kind: "user_ids", userIds: [1, 2] },
        channels: ["in_app", "whatsapp"],
      }),
    ]);
    await notifications.drain();

    const reader = createNotificationReader(runtime);
    expect(await reader.appNotifications()).toHaveLength(2);

    const deliveries = await reader.deliveries();
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({ user_id: 1, channel: "whatsapp" });
  });

  it("reschedules a transient send with backoff then succeeds after the clock advances", async () => {
    await giveAddresses(1, true);
    const notifications = createTestNotificationRuntime(runtime);
    notifications.messages.scriptWhatsApp(
      retryableProviderError("whatsapp", "whatsapp_cloud"),
      okReceipt("whatsapp", "whatsapp_cloud", "wamid.ok"),
    );

    await notifications.enqueue([intent({})]);
    await notifications.runOnce(); // expand + first dispatch attempt

    const reader = createNotificationReader(runtime);
    const [afterRetry] = await reader.deliveries();
    expect(afterRetry).toMatchObject({
      queue_state: "pending",
      attempt_count: 1,
      error_code: "rate_limited",
    });
    expect(afterRetry?.available_at).toBe(NOW + 5_000);

    notifications.advanceClock(5_001);
    await notifications.runOnce();

    const [afterRecovery] = await reader.deliveries();
    expect(afterRecovery).toMatchObject({
      queue_state: "done",
      attempt_count: 2,
      provider_message_id: "wamid.ok",
    });
  });

  it("fails a terminal send immediately without retrying", async () => {
    await giveAddresses(1, true);
    const notifications = createTestNotificationRuntime(runtime);
    notifications.messages.scriptWhatsApp(
      terminalProviderError("whatsapp", "whatsapp_cloud"),
    );

    await notifications.enqueue([intent({})]);
    await notifications.runOnce();

    const reader = createNotificationReader(runtime);
    const [delivery] = await reader.deliveries();
    expect(delivery).toMatchObject({
      queue_state: "failed",
      attempt_count: 1,
      error_code: "bad_request",
    });
    expect(notifications.messages.whatsAppMessages).toHaveLength(1);
  });

  it("stops retrying once the attempt ceiling is reached", async () => {
    await giveAddresses(1, true);
    await runtime.ctx.db
      .insertInto("notification_deliveries")
      .values(
        aDeliveryRow({
          intent_id: "ceiling",
          user_id: 1,
          channel: "whatsapp",
          recipient_address: "51911000001",
          attempt_count: 4,
          max_attempts: 5,
          now: NOW,
        }),
      )
      .execute();
    const notifications = createTestNotificationRuntime(runtime);
    notifications.messages.scriptWhatsApp(
      retryableProviderError("whatsapp", "whatsapp_cloud"),
    );

    await notifications.queues.dispatch.runOnce();

    const reader = createNotificationReader(runtime);
    const [delivery] = await reader.deliveries();
    expect(delivery).toMatchObject({ queue_state: "failed", attempt_count: 5 });
  });

  it("is idempotent when expansion runs again after a lost lease", async () => {
    await giveAddresses(1, true);
    await giveAddresses(2, true);
    const notifications = createTestNotificationRuntime(runtime);
    await notifications.enqueue([
      intent({
        audience: { kind: "user_ids", userIds: [1, 2] },
        channels: ["in_app", "whatsapp"],
      }),
    ]);
    await notifications.drain();

    const reader = createNotificationReader(runtime);
    const before = {
      app: (await reader.appNotifications()).length,
      deliveries: (await reader.deliveries()).length,
    };

    // Simulate the stale-scanner returning a lost-lease intent to pending, then
    // re-expanding. Idempotent writes must not duplicate rows.
    await runtime.ctx.db
      .updateTable("notification_outbox")
      .set({
        queue_state: "pending",
        lease_owner: null,
        lease_until: null,
        available_at: runtime.now.get(),
      })
      .where("id", "=", "intent-1")
      .execute();
    await notifications.drain();

    expect({
      app: (await reader.appNotifications()).length,
      deliveries: (await reader.deliveries()).length,
    }).toEqual(before);
  });
});
