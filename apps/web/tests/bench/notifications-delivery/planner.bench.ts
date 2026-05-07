import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  planDeliveries,
  type NotificationOutboxEntry,
} from "~/server/notifications/delivery-planner";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { PLANNER_SCENARIOS, seedPlannerFixtures } from "./fixtures";

type ScenarioState = {
  cursor: { value: number };
  entries: NotificationOutboxEntry[];
};

describe("notifications delivery planner benchmark", () => {
  const db = createBenchDbFixture("bench-notifications-delivery-planner");
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
    const intentIdsByScenario = await seedPlannerFixtures(ctx);

    for (const scenario of PLANNER_SCENARIOS) {
      const entries = await ctx.db
        .selectFrom("notification_outbox")
        .select(["id", "event_type", "audience_json", "channels_json"])
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

        await planDeliveries(db.ctx().db, entry);
      },
      {
        ...fixedIterations(scenario.intentCount),
        warmupTime: 0,
        warmupIterations: 0,
      },
    );
  }
});
