import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { applyMerchantReportInTransaction } from "~/server/merchant-stats/application/apply-report";
import type { MappedGpvRow } from "~/server/merchant-stats/intake/contracts";
import { IntegrationJobId, UserId } from "~/server/shared/ids";

import { daysBefore, type SeedContext } from "../../shared/context";
import { stableSeedId } from "../../shared/stable-id";
import {
  DEMO_BRANCH_1,
  DEMO_BRANCH_2,
  DEMO_BRANCH_3,
  VALERIA,
} from "../demo-ids";
import { EXECUTIVES, LEAD_SPECS } from "../scenario";
import { generateMerchants, toMappedRow, type MerchantSpec } from "./generator";
import { CULQI_MERCHANT_REPORT_PROFILE as PROFILE } from "./profile";

// Two snapshots exercise both write paths and the "latest snapshot wins" read
// dedup: an older raw dealer upload (no enrichment, backfillAccounts) followed
// by a newer enriched "GPV AL" upload (file-authored seller/zone/projected,
// applyAccountEnrichment). The enriched cut is later, so its metrics supersede
// the raw ones for shared months.
export async function persistDemoMerchantStats(
  db: Kysely<Database>,
  context: SeedContext,
): Promise<void> {
  const merchants = generateMerchants({
    context,
    linkedOrganizations: linkableOrganizations(),
    sellers: await sellerProfiles(db),
    branchNames: await branchNames(db),
    totalMerchants: PROFILE.merchantCount,
  });

  const rawCutDate = isoDate(daysBefore(context, 51));
  const enrichedCutDate = isoDate(daysBefore(context, 11));

  await applySnapshot(db, {
    uploader: VALERIA,
    now: daysBefore(context, 40),
    cutDate: rawCutDate,
    sourceFilename: "planning-report__dealer-infinity-pay.xlsx",
    hasEnrichment: false,
    rows: rowsForSnapshot(merchants, rawCutDate, false),
  });

  await applySnapshot(db, {
    uploader: VALERIA,
    now: daysBefore(context, 1),
    cutDate: enrichedCutDate,
    sourceFilename: "GPV AL - INFINITY PAY.xlsx",
    hasEnrichment: true,
    rows: rowsForSnapshot(merchants, enrichedCutDate, true),
  });
}

interface SnapshotInput {
  uploader: UserId;
  now: Date;
  cutDate: string;
  sourceFilename: string;
  hasEnrichment: boolean;
  rows: MappedGpvRow[];
}

async function applySnapshot(
  db: Kysely<Database>,
  input: SnapshotInput,
): Promise<void> {
  const jobId = await insertGpvJob(db, input);
  const result = await applyMerchantReportInTransaction(
    {
      jobId,
      uploadedBy: input.uploader,
      cutDate: input.cutDate,
      sourceFilename: input.sourceFilename,
      hasEnrichment: input.hasEnrichment,
      validRows: input.rows,
      invalidRows: [],
    },
    { executor: db, now: input.now },
  );

  await db
    .updateTable("workflow_integration_jobs")
    .set({
      status: "COMPLETED",
      queue_state: "done",
      rows_applied: result.rowsApplied,
      rows_failed: result.rowsFailed,
      results_json: JSON.stringify({
        reportId: result.reportId,
        rowsMatched: result.rowsMatched,
        rowsUnmatched: result.rowsUnmatched,
      }),
      completed_at: input.now,
    })
    .where("id", "=", jobId)
    .execute();
}

// A snapshot only carries merchants that existed by its cut date; the raw
// upload predates the newest cohorts, which then appear in the enriched one.
function rowsForSnapshot(
  merchants: readonly MerchantSpec[],
  cutDate: string,
  hasEnrichment: boolean,
): MappedGpvRow[] {
  const rows: MappedGpvRow[] = [];
  for (const merchant of merchants) {
    if (merchant.soldAt > cutDate) continue;
    rows.push(toMappedRow(merchant, rows.length + 1, cutDate, hasEnrichment));
  }
  return rows;
}

async function insertGpvJob(
  db: Kysely<Database>,
  input: SnapshotInput,
): Promise<IntegrationJobId> {
  const jobId = IntegrationJobId.trust(
    stableSeedId(`merchant-report-job:${input.cutDate}:${input.hasEnrichment}`),
  );
  const job = await db
    .insertInto("workflow_integration_jobs")
    .values({
      id: jobId,
      type: "import_gpv",
      status: "PROCESSING",
      queue_state: "processing",
      requested_by_user_id: input.uploader,
      file_path: `seed/${input.sourceFilename}`,
      rows_total: input.rows.length,
      rows_applied: 0,
      rows_failed: 0,
      max_attempts: 3,
      available_at: input.now,
      created_at: input.now,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return job.id;
}

function linkableOrganizations(): Array<{
  ruc: string;
  legalName: string;
  tradeName: string | null;
}> {
  return LEAD_SPECS.slice(0, PROFILE.linkedOrganizationLimit).map((spec) => ({
    ruc: spec.org.ruc,
    legalName: spec.org.legalName,
    tradeName: spec.venue?.tradeName ?? null,
  }));
}

// Match the exact string matchSellerUser normalizes against: names + both
// surnames. Only executives sell, so scope to that role.
async function sellerProfiles(
  db: Kysely<Database>,
): Promise<Array<{ name: string; branchName: string }>> {
  const rows = await db
    .selectFrom("users")
    .innerJoin("branches", "branches.id", "users.branch_id")
    .select([
      "users.names",
      "users.first_surname",
      "users.second_surname",
      "branches.name as branch_name",
    ])
    .where("users.id", "in", Object.values(EXECUTIVES))
    .execute();
  return rows.map((row) => ({
    name: `${row.names} ${row.first_surname} ${row.second_surname}`.trim(),
    branchName: row.branch_name,
  }));
}

async function branchNames(db: Kysely<Database>): Promise<string[]> {
  const rows = await db
    .selectFrom("branches")
    .select("name")
    .where("id", "in", [DEMO_BRANCH_1, DEMO_BRANCH_2, DEMO_BRANCH_3])
    .execute();
  return rows.map((row) => row.name);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
