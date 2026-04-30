import type { Kysely } from "kysely";

import type { Database } from "../../types";
import { compileWorkflowScenario } from "./compiler";
import { persistWorkflowSample as persistDemoSeed } from "./persist/core";
import { persistDemoIdentities } from "./persist/identities";

export async function runDemoIdentitiesSeedStage(
  db: Kysely<Database>,
  nowMs: number,
): Promise<void> {
  await persistDemoIdentities(db, nowMs);
}

export async function runDemoWorkflowSeedStage(
  db: Kysely<Database>,
  nowMs: number,
): Promise<void> {
  const compiled = compileWorkflowScenario(nowMs);
  await persistDemoSeed(db, compiled);
}
