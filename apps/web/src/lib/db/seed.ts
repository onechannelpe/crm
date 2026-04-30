import type { Kysely } from "kysely";

import { createLogger } from "../observability/logger";
import { db as globalDb } from "./db";
import { runBootstrapSeeds } from "./seeds/bootstrap";
import { runDemoSeeds } from "./seeds/demo";
import type { Database } from "./types";

const logger = createLogger("db-seed");

export async function seedIfEmpty(db: Kysely<Database>) {
  const branchCount = await db
    .selectFrom("branches")
    .select(db.fn.countAll().as("count"))
    .executeTakeFirst();

  if (branchCount && Number(branchCount.count) > 0) {
    logger.info("seed_skipped_already_initialized");
    return;
  }

  logger.info("seed_started");
  await runBootstrapSeeds(db);

  const seedMode = process.env.SEED_MODE ?? "demo";
  if (seedMode === "demo") {
    await runDemoSeeds(db);
  }
  logger.info("seed_completed");
}

async function seed() {
  try {
    await seedIfEmpty(globalDb);
    process.exit(0);
  } catch (err) {
    logger.error("seed_failed", { error: err });
    process.exit(1);
  }
}

if (import.meta.main) {
  void seed();
}
