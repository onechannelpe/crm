import type { Kysely } from "kysely";

import type { Database } from "../../types";
import { compileBaseDataScenario } from "./compiler";
import { persistBaseData as persistBootstrapSeed } from "./persist/core";
import { buildBaseDataScenario } from "./scenario";

export async function runBootstrapSeedStage(
  db: Kysely<Database>,
  nowMs: number,
): Promise<void> {
  const scenario = buildBaseDataScenario(nowMs);
  const compiled = compileBaseDataScenario(scenario);
  await persistBootstrapSeed(db, compiled);
}
