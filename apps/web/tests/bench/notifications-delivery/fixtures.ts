import type { TestDbContext } from "@tests/support/runtime/db";

import { enqueueNotifications } from "~/server/notifications/outbox";
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

export const PROCESSOR_SMOKE_INTENT_COUNT = 8;
export const PROCESSOR_SMOKE_RECIPIENTS = 12;

export type PlannerScenarioName = (typeof PLANNER_SCENARIOS)[number]["name"];

type PlannerScenario = (typeof PLANNER_SCENARIOS)[number];

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
          address: `+519${String(userId).padStart(7, "0")}`,
          is_verified: 1,
          verified_at: BENCH_NOW,
          created_at: BENCH_NOW,
          updated_at: BENCH_NOW,
        },
      ]),
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

  return Array.from({ length: intentCount }, (_, intentIndex) => {
    const start = intentIndex * stride;
    return Array.from({ length: recipientsPerIntent }, (_, recipientIndex) => {
      const index = (start + recipientIndex) % userIds.length;
      return userIds[index] as number;
    });
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
): Promise<Record<PlannerScenarioName, string[]>> {
  const result = {} as Record<PlannerScenarioName, string[]>;

  for (const [index, scenario] of PLANNER_SCENARIOS.entries()) {
    result[scenario.name] = await seedPlannerScenario(ctx, scenario, index);
  }

  return result;
}

export async function seedProcessorSmokeFixtures(
  ctx: TestDbContext,
): Promise<string[]> {
  const userStart = USER_ID_START + 90_000;
  const userIds = createUserIds(userStart, PROCESSOR_SMOKE_RECIPIENTS);

  await seedUsersAndAddresses(ctx, userIds, "processor-smoke");

  const intents: NotificationIntent[] = Array.from(
    { length: PROCESSOR_SMOKE_INTENT_COUNT },
    (_, index) => ({
      id: `bench-processor-smoke-${index}`,
      eventType: "bench.notification.delivery",
      audience: { kind: "user_ids", userIds },
      channels: ["in_app", "email", "whatsapp"],
      priority: "normal",
      title: `Bench processor smoke ${index}`,
      bodyText: "Bench processor body",
      actionUrl: null,
    }),
  );

  await enqueueNotifications(ctx.db, intents, BENCH_NOW);
  return intents.map((intent) => intent.id);
}
