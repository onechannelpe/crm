import type { Kysely } from "kysely";

import type { Database } from "../../types";
import { compileBaseDataScenario } from "./compiler";
import { persistBootstrapSeed } from "./persist";
import { buildBaseDataScenario } from "./scenario";

export async function runBootstrapSeeds(db: Kysely<Database>): Promise<void> {
  const scenario = buildBaseDataScenario(Date.now());
  const compiled = compileBaseDataScenario(scenario);
  await persistBootstrapSeed(db, compiled);
}
