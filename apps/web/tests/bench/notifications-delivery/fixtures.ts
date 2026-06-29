import type { TestDbContext } from "@tests/support/runtime/db";

import { enqueueNotifications } from "~/server/notifications/intent/enqueue";
import {
  createDeliveryRepository,
  type DeliveryJob,
} from "~/server/notifications/repos/delivery-repo";
import type { IntentJob } from "~/server/notifications/repos/intent-repo";
import type { NotificationIntent } from "~/server/notifications/types";

import { BENCH_NOW } from "../_shared/constants";

const USER_ID_START = 300_000;

export const PLANNER_SCENARIOS = [
  {
    name: "disjoint",
    intentCount: 12,
    recipientsPerIntent: 24,
    overlapRatio: 0,
  },
  {
    name: "partial-overlap",
    intentCount: 12,
    recipientsPerIntent: 24,
    overlapRatio: 0.5,
  },
  {
    name: "high-overlap",
    intentCount: 12,
    recipientsPerIntent: 24,
    overlapRatio: 0.85,
  },
] as const;

export const EXPAND_INTENT_COUNT = 24;
export const EXPAND_RECIPIENTS = 12;
export const DISPATCH_DELIVERY_COUNT = 200;

export type PlannerScenarioName = (typeof PLANNER_SCENARIOS)[number]["name"];

type PlannerScenario = (typeof PLANNER_SCENARIOS)[number];
type PlannerScenarioResult<T> = Record<PlannerScenarioName, T>;

function createUserIds(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => start + index);
}

async function seedUsersAndAddresses(
  ctx: TestDbContext,
  userIds: number[],
  seedKey: string,
): Promise<void> {
  await ctx.db
    .insertInto("users")
    .values(
      userIds.map((userId, index) => ({
        id: userId,
        branch_id: 1,
        team_id: null,
        username: `bench.notify.${seedKey}.${userId}`,
        email: `bench-${seedKey}-${index}@test.local`,
        password_hash: "bench-hash",
        names: `Bench Notify ${seedKey} ${index}`,
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
          address: `bench-${seedKey}-${index}@test.local`,
          is_verified: 1,
          verified_at: BENCH_NOW,
          created_at: BENCH_NOW,
          updated_at: BENCH_NOW,
        },
        {
          user_id: userId,
          channel: "whatsapp" as const,
          address: `9${String(userId).padStart(8, "0")}`,
          is_verified: 1,
          verified_at: BENCH_NOW,
          created_at: BENCH_NOW,
          updated_at: BENCH_NOW,
        },
      ]),
    )
    .execute();

  await ctx.db
    .insertInto("whatsapp_sessions")
    .values(
      userIds.map((userId) => ({
        user_id: userId,
        expires_at: BENCH_NOW + 24 * 60 * 60 * 1000,
      })),
    )
    .execute();
}

function createAudiencePool(
  userIds: number[],
  recipientsPerIntent: number,
  overlapRatio: number,
  intentCount: number,
): number[][] {
  const stride = Math.max(
    1,
    Math.round(recipientsPerIntent * (1 - overlapRatio)),
  );

  return Array.from({ length: intentCount }, (_outerIndex, intentIndex) => {
    const start = intentIndex * stride;
    return Array.from(
      { length: recipientsPerIntent },
      (_innerIndex, recipientIndex) => {
        const index = (start + recipientIndex) % userIds.length;
        return userIds[index];
      },
    );
  });
}

async function seedPlannerScenario(
  ctx: TestDbContext,
  scenario: PlannerScenario,
  scenarioIndex: number,
): Promise<string[]> {
  const stride = Math.max(
    1,
    Math.round(scenario.recipientsPerIntent * (1 - scenario.overlapRatio)),
  );
  const totalUsers =
    scenario.recipientsPerIntent + stride * (scenario.intentCount - 1);
  const userStart = USER_ID_START + scenarioIndex * 20_000;
  const userIds = createUserIds(userStart, totalUsers);

  await seedUsersAndAddresses(ctx, userIds, `planner-${scenario.name}`);

  const audiences = createAudiencePool(
    userIds,
    scenario.recipientsPerIntent,
    scenario.overlapRatio,
    scenario.intentCount,
  );

  const intents: NotificationIntent[] = audiences.map(
    (audienceUserIds, index) => ({
      id: `bench-planner-${scenario.name}-${index}`,
      eventType: "bench.notification.delivery",
      audience: { kind: "user_ids", userIds: audienceUserIds },
      channels: ["email", "whatsapp"],
      priority: "normal",
      title: `Bench planner ${scenario.name} ${index}`,
      bodyText: "Bench planner body",
      actionUrl: null,
    }),
  );

  await enqueueNotifications(ctx.db, intents, BENCH_NOW);
  return intents.map((intent) => intent.id);
}

export async function seedPlannerFixtures(
  ctx: TestDbContext,
): Promise<PlannerScenarioResult<string[]>> {
  const [disjoint, partialOverlap, highOverlap] = PLANNER_SCENARIOS;

  const [disjointIds, partialOverlapIds, highOverlapIds] = await Promise.all([
    seedPlannerScenario(ctx, disjoint, 0),
    seedPlannerScenario(ctx, partialOverlap, 1),
    seedPlannerScenario(ctx, highOverlap, 2),
  ]);

  return {
    disjoint: disjointIds,
    "partial-overlap": partialOverlapIds,
    "high-overlap": highOverlapIds,
  };
}

// One independent intent per iteration for the expansion-stage benchmark. Each
// intent fans out to the same recipient set across all three channels; the
// returned jobs are the content the expander operates on.
export async function seedExpandFixtures(
  ctx: TestDbContext,
): Promise<IntentJob[]> {
  const userIds = createUserIds(USER_ID_START + 90_000, EXPAND_RECIPIENTS);
  await seedUsersAndAddresses(ctx, userIds, "expand");

  const intents: NotificationIntent[] = Array.from(
    { length: EXPAND_INTENT_COUNT },
    (_, index) => ({
      id: `bench-expand-${index}`,
      eventType: "bench.notification.delivery",
      audience: { kind: "user_ids", userIds },
      channels: ["in_app", "email", "whatsapp"],
      priority: "normal",
      title: `Bench expand ${index}`,
      bodyText: "Bench expand body",
      actionUrl: null,
    }),
  );
  await enqueueNotifications(ctx.db, intents, BENCH_NOW);

  return ctx.db
    .selectFrom("notification_outbox")
    .select([
      "id",
      "attempt_count",
      "max_attempts",
      "event_type",
      "audience_json",
      "channels_json",
      "priority",
      "title",
      "body_text",
      "action_url",
    ])
    .where(
      "id",
      "in",
      intents.map((intent) => intent.id),
    )
    .execute();
}

// One independent pending delivery per iteration for the dispatch-stage
// benchmark. Distinct intent ids keep the unique (intent,user,channel) key from
// collapsing the rows.
export async function seedDispatchFixtures(
  ctx: TestDbContext,
): Promise<DeliveryJob[]> {
  const userIds = createUserIds(USER_ID_START + 110_000, 1);
  await seedUsersAndAddresses(ctx, userIds, "dispatch");
  const [userId] = userIds;

  const deliveries = createDeliveryRepository(ctx.db);
  await deliveries.insertPlanned(
    Array.from({ length: DISPATCH_DELIVERY_COUNT }, (_, index) => ({
      intent_id: `bench-dispatch-${index}`,
      user_id: userId,
      channel: "email" as const,
      recipient_address: `bench-dispatch-${index}@test.local`,
      title: `Bench dispatch ${index}`,
      body_text: "Bench dispatch body",
      action_url: null,
    })),
    BENCH_NOW,
  );

  return ctx.db
    .selectFrom("notification_deliveries")
    .select([
      "id",
      "attempt_count",
      "max_attempts",
      "intent_id",
      "user_id",
      "channel",
      "recipient_address",
      "title",
      "body_text",
      "action_url",
    ])
    .where("intent_id", "like", "bench-dispatch-%")
    .execute();
}
