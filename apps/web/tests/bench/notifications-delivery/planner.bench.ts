import { afterAll, beforeAll, bench, describe } from "vitest";

import type { Json } from "~/contracts/json";
import { createLogger } from "~/lib/observability/logger";
import {
  createRecipientPlanner,
  projectIntentForPlanning,
} from "~/server/notifications/expansion/plan-recipients";
import { isErr } from "~/server/shared/result";

import { BENCH_NOW } from "../_shared/constants";
import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { PLANNER_SCENARIOS, seedPlannerFixtures } from "./fixtures";

type PlannerEntry = {
  event_type: string;
  audience_json: Json;
  channels_json: Json;
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
    planRecipients = createRecipientPlanner(
      ctx.db,
      createLogger("bench-notification-planner"),
    );
    const intentIdsByScenario = await seedPlannerFixtures(ctx);

    for (const scenario of PLANNER_SCENARIOS) {
      const entries = await ctx.db
        .selectFrom("notification_intents")
        .select(["event_type", "audience_json", "channels_json"])
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
        const input = projectIntentForPlanning(entry);
        if (isErr(input)) {
          throw new Error(input.error);
        }
        await planRecipients(input.value, BENCH_NOW);
      },
      {
        ...fixedIterations(scenario.intentCount),
        warmupTime: 0,
        warmupIterations: 0,
      },
    );
  }
});
