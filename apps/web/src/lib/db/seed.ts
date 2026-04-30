import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Kysely } from "kysely";

import { createLogger } from "../observability/logger";
import { db as globalDb } from "./db";
import { runBootstrapSeedStage } from "./seeds/bootstrap";
import {
  runDemoIdentitiesSeedStage,
  runDemoWorkflowSeedStage,
} from "./seeds/demo";
import type { Database } from "./types";

const logger = createLogger("db-seed");
const SEED_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)));

type SeedStatus = "running" | "completed" | "failed";
type SeedStage = {
  seedName: string;
  sourceFiles: readonly string[];
  run: (db: Kysely<Database>, nowMs: number) => Promise<void>;
};

export async function seedIfEmpty(db: Kysely<Database>) {
  logger.info("seed_started");
  const nowMs = Date.now();
  const stages: SeedStage[] = [BOOTSTRAP_STAGE];
  if ((process.env.SEED_MODE ?? "demo") === "demo") {
    stages.push(DEMO_IDENTITIES_STAGE, DEMO_WORKFLOW_STAGE);
  }

  for (const stage of stages) {
    // eslint-disable-next-line no-await-in-loop
    const seedId = await computeSeedId(stage);
    // eslint-disable-next-line no-await-in-loop
    const status = await executeStage(db, stage, seedId, nowMs);
    logger.info("seed_stage_finished", {
      seed_name: stage.seedName,
      seed_id: seedId,
      status,
    });
  }

  logger.info("seed_completed");
}

async function executeStage(
  db: Kysely<Database>,
  stage: SeedStage,
  seedId: string,
  nowMs: number,
): Promise<SeedStatus | "skipped"> {
  const current = await db
    .selectFrom("seed_runs")
    .select(["status"])
    .where("seed_name", "=", stage.seedName)
    .where("seed_id", "=", seedId)
    .executeTakeFirst();
  if (current?.status === "completed") {
    return "skipped";
  }

  const startedAtMs = Date.now();
  await upsertSeedRunStatus(
    db,
    stage.seedName,
    seedId,
    "running",
    startedAtMs,
    null,
    null,
  );

  try {
    await db.transaction().execute(async (trx) => {
      await stage.run(trx, nowMs);
    });
    await upsertSeedRunStatus(
      db,
      stage.seedName,
      seedId,
      "completed",
      startedAtMs,
      Date.now(),
      null,
    );
    return "completed";
  } catch (error) {
    await upsertSeedRunStatus(
      db,
      stage.seedName,
      seedId,
      "failed",
      startedAtMs,
      Date.now(),
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

async function upsertSeedRunStatus(
  db: Kysely<Database>,
  seedName: string,
  seedId: string,
  status: SeedStatus,
  startedAtMs: number,
  completedAtMs: number | null,
  errorMessage: string | null,
): Promise<void> {
  await db
    .insertInto("seed_runs")
    .values({
      seed_name: seedName,
      seed_id: seedId,
      status,
      started_at: startedAtMs,
      completed_at: completedAtMs,
      error_message: errorMessage,
    })
    .onConflict((oc) =>
      oc.columns(["seed_name", "seed_id"]).doUpdateSet({
        status,
        started_at: startedAtMs,
        completed_at: completedAtMs,
        error_message: errorMessage,
      }),
    )
    .execute();
}

async function computeSeedId(stage: SeedStage): Promise<string> {
  const hash = new Bun.CryptoHasher("sha256");
  hash.update(stage.seedName);
  hash.update("\n");
  for (const relativePath of stage.sourceFiles) {
    const path = resolve(SEED_DIR, relativePath);
    // eslint-disable-next-line no-await-in-loop
    const content = await readFile(path, "utf8");
    hash.update(relativePath);
    hash.update("\n");
    hash.update(content);
    hash.update("\n");
  }
  return hash.digest("hex");
}

const BOOTSTRAP_STAGE: SeedStage = {
  seedName: "bootstrap",
  sourceFiles: [
    "./seeds/bootstrap/index.ts",
    "./seeds/bootstrap/persist/core.ts",
    "./seeds/bootstrap/persist/branches-policies.ts",
    "./seeds/bootstrap/persist/users-teams.ts",
    "./seeds/bootstrap/persist/workflow-kinds.ts",
    "./seeds/bootstrap/persist/audit-policies.ts",
  ],
  run: runBootstrapSeedStage,
};

const DEMO_IDENTITIES_STAGE: SeedStage = {
  seedName: "demo-identities",
  sourceFiles: ["./seeds/demo/index.ts", "./seeds/demo/persist/identities.ts"],
  run: runDemoIdentitiesSeedStage,
};

const DEMO_WORKFLOW_STAGE: SeedStage = {
  seedName: "demo-workflow",
  sourceFiles: [
    "./seeds/demo/index.ts",
    "./seeds/demo/scenario.ts",
    "./seeds/demo/compiler.ts",
    "./seeds/demo/persist/core.ts",
    "./seeds/demo/persist/organizations.ts",
    "./seeds/demo/persist/workflow-leads.ts",
    "./seeds/demo/persist/search-overlays.ts",
    "./seeds/demo/persist/workflow-commercial.ts",
    "./seeds/demo/persist/history-events.ts",
  ],
  run: runDemoWorkflowSeedStage,
};

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
