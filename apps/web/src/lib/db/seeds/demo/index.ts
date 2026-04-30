import type { Kysely } from "kysely";

import type { Database } from "../../types";
import { compileWorkflowScenario } from "./compiler";
import { persistDemoSeed } from "./persist";

export async function runDemoSeeds(db: Kysely<Database>): Promise<void> {
  const existing = await db
    .selectFrom("workflow_leads")
    .select(db.fn.countAll().as("count"))
    .executeTakeFirst();
  if (existing && Number(existing.count) > 0) return;

  const compiled = compileWorkflowScenario();
  await persistDemoSeed(db, compiled);
}
