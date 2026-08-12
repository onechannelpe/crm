import type { Kysely, Transaction } from "kysely";

import type { Database } from "../../types";
import type { SeedContext } from "../shared/context";
import { compileWorkflowScenario } from "./compiler";
import { persistDemoMerchantStats } from "./merchant-stats/persist";
import { persistWorkflowSample as persistDemoSeed } from "./persist/core";
import { persistDemoIdentities } from "./persist/identities";

export async function runDemoIdentitiesSeedStage(
  db: Kysely<Database>,
  context: SeedContext,
): Promise<void> {
  await persistDemoIdentities(db, context);
}

export async function runDemoWorkflowSeedStage(
  db: Kysely<Database>,
  context: SeedContext,
): Promise<void> {
  const compiled = compileWorkflowScenario(context.anchorDate.getTime());
  await persistDemoSeed(db, compiled);
}

export async function runDemoMerchantStatsSeedStage(
  db: Transaction<Database>,
  context: SeedContext,
): Promise<void> {
  await persistDemoMerchantStats(db, context);
}
