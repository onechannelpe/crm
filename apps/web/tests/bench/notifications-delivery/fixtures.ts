import type { TestDbContext } from "@tests/support/runtime/db";

import { enqueueNotifications } from "~/server/notifications/outbox";
import type { NotificationIntent } from "~/server/notifications/types";

import { BENCH_NOW } from "../_shared/constants";

const USER_ID_START = 300_000;
export const RECIPIENT_POOL_SIZE = 300;
export const INTENT_POOL_SIZE = 40;

export interface NotificationsDeliveryFixtures {
  intentIds: string[];
}

function createUserIds(): number[] {
  return Array.from(
    { length: RECIPIENT_POOL_SIZE },
    (_, index) => USER_ID_START + index,
  );
}

export async function seedNotificationsDeliveryFixtures(
  ctx: TestDbContext,
): Promise<NotificationsDeliveryFixtures> {
  const userIds = createUserIds();

  await ctx.db
    .insertInto("users")
    .values(
      userIds.map((userId, index) => ({
        id: userId,
        branch_id: 1,
        team_id: null,
        username: `bench.notify.${userId}`,
        email: `bench-notify-${index}@test.local`,
        password_hash: "bench-hash",
        names: `Bench Notify ${index}`,
        first_surname: "User",
        second_surname: "Bench",
        onboarding_completed_at: BENCH_NOW,
        role: "executive" as const,
        executive_category: "elite" as const,
        is_active: 1,
        created_at: BENCH_NOW,
      })),
    )
    .execute();

  await ctx.db
    .insertInto("user_channel_addresses")
    .values(
      userIds.flatMap((userId, index) => [
        {
          user_id: userId,
          channel: "email" as const,
          address: `bench-notify-${index}@test.local`,
          is_verified: 1,
          verified_at: BENCH_NOW,
          created_at: BENCH_NOW,
          updated_at: BENCH_NOW,
        },
        {
          user_id: userId,
          channel: "whatsapp" as const,
          address: `+519${String(index).padStart(7, "0")}`,
          is_verified: 1,
          verified_at: BENCH_NOW,
          created_at: BENCH_NOW,
          updated_at: BENCH_NOW,
        },
      ]),
    )
    .execute();

  const intents: NotificationIntent[] = Array.from(
    { length: INTENT_POOL_SIZE },
    (_, index) => ({
      id: `bench-notify-intent-${index}`,
      eventType: "bench.notification.delivery",
      audience: { kind: "user_ids", userIds },
      channels: ["in_app", "email", "whatsapp"],
      priority: "normal",
      title: `Bench title ${index}`,
      bodyText: "Bench notification body",
      actionUrl: null,
    }),
  );

  await enqueueNotifications(ctx.db, intents, BENCH_NOW);

  return {
    intentIds: intents.map((intent) => intent.id),
  };
}
