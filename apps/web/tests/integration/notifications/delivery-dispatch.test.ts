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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { NotificationIntent } from "~/server/notifications/types";
import { openSession } from "~/server/notifications/whatsapp-session";
import type { UserId } from "~/domain/ids";
import { NotificationIntentId } from "~/domain/ids";

const NOW_MS = 1_700_000_000_000;
const NOW = new Date(NOW_MS);

describe("notification delivery dispatch", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("notification-delivery-dispatch");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(NOW);
  });

  async function giveAddresses(userId: UserId, withSession: boolean) {
    await runtime.ctx.repos.userChannelAddresses.upsert({
      user_id: userId,
      channel: "email",
      address: `user-${userId}@test.local`,
      is_verified: true,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });

    await runtime.ctx.repos.userChannelAddresses.upsert({
      user_id: userId,
      channel: "whatsapp",
      address: `5191100000${userId}`,
      is_verified: true,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });

    if (withSession) {
      await openSession(runtime.ctx.db, userId, NOW);
    }
  }

  function intent(overrides: Partial<NotificationIntent>): NotificationIntent {
    return {
      id: NotificationIntentId.derive({
        sourceEventId: "event-intent-1",
        discriminator: "intent-1",
      }),
      eventType: "lead.ready_for_sale",
      audience: {
        kind: "user_ids",
        userIds: [runtime.ctx.fixtures.users.execOne.id],
      },
      channels: ["whatsapp"],
      priority: "normal",
      title: "Title",
      bodyText: "Body",
      actionUrl: null,
      ...overrides,
    };
  }

  it("fans out one delivery per recipient per external channel", async () => {
    const { execOne, backOne } = runtime.ctx.fixtures.users;

    await giveAddresses(execOne.id, true);
    await giveAddresses(backOne.id, true);

    const notifications = createTestNotificationRuntime(runtime);

    await notifications.enqueue([
      intent({
        audience: {
          kind: "user_ids",
          userIds: [execOne.id, backOne.id],
        },
        channels: ["in_app", "email", "whatsapp"],
      }),
    ]);
    await notifications.drain();

    const reader = createNotificationReader(runtime);

    expect(await reader.appNotifications()).toHaveLength(2);

    const deliveries = await reader.deliveries();

    expect(deliveries).toHaveLength(4);
    expect(
      deliveries.every((delivery) => delivery.queue_state === "done"),
    ).toBe(true);
    expect(
      deliveries
        .map((delivery) => `${delivery.user_id}:${delivery.channel}`)
        .toSorted(),
    ).toEqual(
      [
        `${backOne.id}:email`,
        `${backOne.id}:whatsapp`,
        `${execOne.id}:email`,
        `${execOne.id}:whatsapp`,
      ].toSorted(),
    );
  });

  it("skips a WhatsApp recipient without an active session but still writes in-app", async () => {
    const { execOne, backOne } = runtime.ctx.fixtures.users;

    await giveAddresses(execOne.id, true);
    await giveAddresses(backOne.id, false);

    const notifications = createTestNotificationRuntime(runtime);

    await notifications.enqueue([
      intent({
        audience: {
          kind: "user_ids",
          userIds: [execOne.id, backOne.id],
        },
        channels: ["in_app", "whatsapp"],
      }),
    ]);
    await notifications.drain();

    const reader = createNotificationReader(runtime);

    expect(await reader.appNotifications()).toHaveLength(2);

    const deliveries = await reader.deliveries();

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({
      user_id: execOne.id,
      channel: "whatsapp",
    });
  });

  it("reschedules a transient send with backoff then succeeds after the clock advances", async () => {
    await giveAddresses(runtime.ctx.fixtures.users.execOne.id, true);

    const notifications = createTestNotificationRuntime(runtime);

    notifications.messages.scriptWhatsApp(
      retryableProviderError("whatsapp", "whatsapp_cloud"),
      okReceipt("whatsapp", "whatsapp_cloud", "wamid.ok"),
    );

    await notifications.enqueue([intent({})]);
    await notifications.expandThenDispatch();

    const reader = createNotificationReader(runtime);
    const [afterRetry] = await reader.deliveries();

    expect(afterRetry).toMatchObject({
      queue_state: "pending",
      attempt_count: 1,
      error_code: "rate_limited",
    });

    // Equal jitter puts the first retry in [2.5s, 5s), not exactly 5s.
    expect(afterRetry?.claimable_at?.getTime()).toBeGreaterThanOrEqual(
      NOW_MS + 2_500,
    );
    expect(afterRetry?.claimable_at?.getTime()).toBeLessThan(NOW_MS + 5_000);

    notifications.advanceClock(5_001);
    await notifications.expandThenDispatch();

    const [afterRecovery] = await reader.deliveries();

    expect(afterRecovery).toMatchObject({
      queue_state: "done",
      attempt_count: 2,
      provider_message_id: "wamid.ok",
    });
  });

  it("fails a terminal send immediately without retrying", async () => {
    await giveAddresses(runtime.ctx.fixtures.users.execOne.id, true);

    const notifications = createTestNotificationRuntime(runtime);

    notifications.messages.scriptWhatsApp(
      terminalProviderError("whatsapp", "whatsapp_cloud"),
    );

    await notifications.enqueue([intent({})]);
    await notifications.expandThenDispatch();

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
    const { execOne } = runtime.ctx.fixtures.users;

    await giveAddresses(execOne.id, true);

    await runtime.ctx.db
      .insertInto("notification_deliveries")
      .values(
        aDeliveryRow({
          intent_id: NotificationIntentId.trust("ceiling"),
          user_id: execOne.id,
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

    await notifications.queues.dispatch.drain();

    const reader = createNotificationReader(runtime);
    const [delivery] = await reader.deliveries();

    expect(delivery).toMatchObject({
      queue_state: "failed",
      attempt_count: 5,
    });
  });

  it("is idempotent when expansion runs again after a lost lease", async () => {
    const { execOne, backOne } = runtime.ctx.fixtures.users;

    await giveAddresses(execOne.id, true);
    await giveAddresses(backOne.id, true);

    const notifications = createTestNotificationRuntime(runtime);

    await notifications.enqueue([
      intent({
        audience: {
          kind: "user_ids",
          userIds: [execOne.id, backOne.id],
        },
        channels: ["in_app", "whatsapp"],
      }),
    ]);
    await notifications.drain();

    const reader = createNotificationReader(runtime);
    const before = {
      app: (await reader.appNotifications()).length,
      deliveries: (await reader.deliveries()).length,
    };

    // Simulate a worker losing its lease after expansion completed.
    await runtime.ctx.db
      .updateTable("notification_intents")
      .set({
        queue_state: "pending",
        lease_owner: null,
        claimable_at: runtime.now.get(),
      })
      .where(
        "id",
        "=",
        NotificationIntentId.derive({
          sourceEventId: "event-intent-1",
          discriminator: "intent-1",
        }),
      )
      .execute();

    await notifications.drain();

    expect({
      app: (await reader.appNotifications()).length,
      deliveries: (await reader.deliveries()).length,
    }).toEqual(before);
  });
});
