import type { Kysely } from "kysely";

import { createLogger } from "../observability/logger";
import { db as globalDb } from "./db";
import {
  runDemoIdentitiesSeedStage,
  runDemoMerchantStatsSeedStage,
  runDemoWorkflowSeedStage,
} from "./seeds/demo";
import {
  provisionInstallation,
  verifyInstallation,
} from "./seeds/installation";
import { createSeedContext } from "./seeds/shared/context";
import type { Database } from "./types";

const logger = createLogger("db-seed");

export async function seedIfEmpty(db: Kysely<Database>): Promise<void> {
  const existingUser = await db
    .selectFrom("users")
    .select("id")
    .limit(1)
    .executeTakeFirst();

  if (existingUser) {
    await verifyInstallation(db);
    logger.info("seed_skipped_already_initialized");
    return;
  }

  logger.info("seed_started");
  const context = createSeedContext();
  const includeDemoFixtures = process.env.NODE_ENV !== "production";

  await db.transaction().execute(async (trx) => {
    await provisionInstallation(trx, context.anchorDate);

    if (includeDemoFixtures) {
      await runDemoIdentitiesSeedStage(trx, context);
      await runDemoWorkflowSeedStage(trx, context);
      await runDemoMerchantStatsSeedStage(trx, context);
    }
  });

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
