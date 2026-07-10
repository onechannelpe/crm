import { afterAll, beforeAll, bench, describe } from "vitest";

import { createLogger } from "~/lib/observability/logger";
import {
  createRecipientPlanner,
  projectIntentForPlanning,
} from "~/server/notifications/expansion/plan-recipients";
import { isErr } from "~/server/shared/result";

import { BENCH_NOW } from "../_shared/constants";
import { createBenchDbFixture } from "../_shared/fixture";
import {
  PLANNER_SCENARIOS,
  type PlannerEntry,
  type PlannerScenarioName,
  seedPlannerEntries,
} from "./fixtures";

describe("notifications delivery planner benchmark", () => {
  const db = createBenchDbFixture("bench-notifications-delivery-planner");
  let planRecipients: ReturnType<typeof createRecipientPlanner>;
  let entries: Record<PlannerScenarioName, PlannerEntry>;

  beforeAll(async () => {
    const ctx = await db.setup();
    planRecipients = createRecipientPlanner(
      ctx.db,
      createLogger("bench-notification-planner"),
    );
    entries = await seedPlannerEntries(ctx);
  });

  afterAll(async () => {
    await db.teardown();
  });

  for (const scenario of PLANNER_SCENARIOS) {
    bench(`service path: plan deliveries (${scenario.name})`, async () => {
      const input = projectIntentForPlanning(entries[scenario.name]);
      if (isErr(input)) {
        throw new Error(input.error);
      }
      await planRecipients(input.value, BENCH_NOW);
    });
  }
});
