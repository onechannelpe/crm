import {
  anIntentRow,
  notificationIntentId,
} from "@tests/support/builders/notifications";
import {
  cleanupFreshDb,
  createFreshDb,
  databaseUrl,
  type FreshDbContext,
} from "@tests/support/runtime/db";
import { Client, type Notification } from "pg";
import { afterEach, describe, expect, it } from "vitest";

import { createIntentRepository } from "~/server/notifications/repos/intent-repo";
import { migrateToLatest } from "~/server/platform/database/migrate";

const NOW = new Date(1_700_000_000_000);
const CHANNEL = "job:notifications-intents";

function waitForNotification(
  listener: Client,
  timeoutMs = 2_000,
): Promise<Notification> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      listener.removeListener("notification", onNotification);
      reject(
        new Error(`timed out waiting for a notification after ${timeoutMs}ms`),
      );
    }, timeoutMs);

    function onNotification(notification: Notification) {
      clearTimeout(timer);
      listener.removeListener("notification", onNotification);
      resolve(notification);
    }

    listener.on("notification", onNotification);
  });
}

async function collectNotifications(
  listener: Client,
  run: () => Promise<void>,
  windowMs = 200,
): Promise<Notification[]> {
  const notifications: Notification[] = [];

  function onNotification(notification: Notification) {
    notifications.push(notification);
  }

  listener.on("notification", onNotification);

  try {
    await run();
    await new Promise((resolve) => setTimeout(resolve, windowMs));
    return notifications;
  } finally {
    listener.removeListener("notification", onNotification);
  }
}

describe("notification intent queue wake trigger", () => {
  let ctx: FreshDbContext | null = null;
  let listener: Client | null = null;

  afterEach(async () => {
    await listener?.end();
    listener = null;

    await cleanupFreshDb(ctx);
    ctx = null;
  });

  it("wakes only when work becomes pending", async () => {
    ctx = await createFreshDb("notification-intent-queue-wake");
    const db = ctx.db;
    await migrateToLatest(db);

    listener = new Client({
      connectionString: databaseUrl(ctx.dbName),
    });

    await listener.connect();
    await listener.query(`LISTEN "${CHANNEL}"`);

    const repository = createIntentRepository(db);
    const id = notificationIntentId("intent-1");

    const inserted = waitForNotification(listener);

    await db
      .insertInto("notification_intents")
      .values(anIntentRow({ id: "intent-1", now: NOW }))
      .execute();

    await expect(inserted).resolves.toMatchObject({
      channel: CHANNEL,
    });

    const claimNotifications = await collectNotifications(
      listener,
      async () => {
        await repository.store.claim("worker-1", NOW, 10, 30_000);
      },
    );

    expect(claimNotifications).toEqual([]);

    const unrelatedUpdateNotifications = await collectNotifications(
      listener,
      async () => {
        await db
          .updateTable("notification_intents")
          .set({ error_message: "irrelevant progress update" })
          .where("id", "=", id)
          .execute();
      },
    );

    expect(unrelatedUpdateNotifications).toEqual([]);

    const retried = waitForNotification(listener);

    await repository.store.scheduleRetry(
      id,
      "worker-1",
      new Date(NOW.getTime() + 5_000),
      null,
    );

    await expect(retried).resolves.toMatchObject({
      channel: CHANNEL,
    });
  });
});
