import type { Kysely } from "kysely";

import { createLogger } from "../observability/logger";
import { db as globalDb } from "./db";
import { run as runBaseData } from "./seeds/01-base-data";
import { run as runDemoWorkflow } from "./seeds/02-demo-workflow";
import type { Database } from "./types";

const logger = createLogger("db-seed");

export async function seedIfEmpty(db: Kysely<Database>) {
  const userCount = await db
    .selectFrom("users")
    .select(db.fn.countAll().as("count"))
    .executeTakeFirst();

  if (userCount && Number(userCount.count) > 0) {
    logger.info("seed_skipped_already_initialized");
    return;
  }

  logger.info("seed_started");
  await runBaseData(db);
  await runDemoWorkflow(db);
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
