import { afterAll, beforeAll, bench, describe } from "vitest";

import { createLogger } from "~/lib/observability/logger";
import { createRecipientPlanner } from "~/server/notifications/expansion/plan-recipients";
import {
  parseNotificationAudience,
  parseNotificationChannels,
} from "~/server/notifications/intent/payload";
import { createRecipientRepository } from "~/server/notifications/repos/recipient-repo";

import { BENCH_NOW } from "../_shared/constants";
import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { PLANNER_SCENARIOS, seedPlannerFixtures } from "./fixtures";

type PlannerEntry = {
  audience_json: string;
  channels_json: string;
};

type ScenarioState = {
  cursor: { value: number };
  entries: PlannerEntry[];
};

describe("notifications delivery planner benchmark", () => {
  const db = createBenchDbFixture("bench-notifications-delivery-planner");
  let planRecipients: ReturnType<typeof createRecipientPlanner> | null = null;
  const scenarios: {
    disjoint: ScenarioState;
    "partial-overlap": ScenarioState;
    "high-overlap": ScenarioState;
  } = {
    disjoint: { cursor: { value: 0 }, entries: [] },
    "partial-overlap": { cursor: { value: 0 }, entries: [] },
    "high-overlap": { cursor: { value: 0 }, entries: [] },
  };

  beforeAll(async () => {
    const ctx = await db.setup();
    planRecipients = createRecipientPlanner({
      repository: createRecipientRepository(ctx.db),
      logger: createLogger("bench-notification-planner"),
    });
    const intentIdsByScenario = await seedPlannerFixtures(ctx);

    for (const scenario of PLANNER_SCENARIOS) {
      const entries = await ctx.db
        .selectFrom("notification_outbox")
        .select(["audience_json", "channels_json"])
        .where("id", "in", intentIdsByScenario[scenario.name])
        .execute();

      scenarios[scenario.name] = {
        cursor: { value: 0 },
        entries,
      };
    }
  });

  afterAll(async () => {
    await db.teardown();
  });

  for (const scenario of PLANNER_SCENARIOS) {
    bench(
      `service path: plan deliveries (${scenario.name})`,
      async () => {
        const scenarioState = scenarios[scenario.name];
        const entry = takeFromPool(
          scenarioState.entries,
          scenarioState.cursor,
          `planner pool exhausted for scenario ${scenario.name}`,
        );

        if (!planRecipients) {
          throw new Error("planner benchmark used before setup");
        }
        await planRecipients(
          {
            audience: parseNotificationAudience(entry.audience_json),
            channels: parseNotificationChannels(entry.channels_json),
          },
          BENCH_NOW,
        );
      },
      {
        ...fixedIterations(scenario.intentCount),
        warmupTime: 0,
        warmupIterations: 0,
      },
    );
  }
});
