import { createHash } from "node:crypto";

import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { recomputeAttribution } from "~/server/merchant-stats/attribution/recompute";
import { acceptReport } from "~/server/merchant-stats/commands/accept-report";
import { setTarget } from "~/server/merchant-stats/commands/set-target";
import { batchByRuc } from "~/server/merchant-stats/facts/batch-by-ruc";
import {
  insertRejections,
  writeFactsBatch,
} from "~/server/merchant-stats/facts/write-batch";
import type {
  ParsedReport,
  SourceRow,
} from "~/server/merchant-stats/intake/types";
import type { UserId } from "~/server/shared/ids";

import { daysBefore, type SeedContext } from "../../shared/context";
import { VALERIA } from "../demo-ids";
import { LEAD_SPECS, MERCHANT_STATS_SERIAL_LINKS } from "../scenario";
import { generateMerchants, toSourceRow, type MerchantSpec } from "./generator";
import { CULQI_MERCHANT_REPORT_PROFILE as PROFILE } from "./profile";

const SEED_BATCH_TARGET_ROWS = 2000;

export async function persistDemoMerchantStats(
  db: Kysely<Database>,
  context: SeedContext,
): Promise<void> {
  const merchants = generateMerchants({
    context,
    linkedOrganizations: linkableOrganizations(),
    totalMerchants: PROFILE.merchantCount,
  });

  await applySnapshot(db, {
    uploader: VALERIA,
    now: daysBefore(context, 40),
    cutAt: daysBefore(context, 51),
    merchants,
  });

  await applySnapshot(db, {
    uploader: VALERIA,
    now: daysBefore(context, 1),
    cutAt: daysBefore(context, 11),
    merchants,
  });

  await persistTargets(db, merchants, context);
}

interface SnapshotInput {
  uploader: UserId;
  now: Date;
  cutAt: Date;
  merchants: readonly MerchantSpec[];
}

async function applySnapshot(
  db: Kysely<Database>,
  input: SnapshotInput,
): Promise<void> {
  const cutDate = isoDate(input.cutAt);
  const parsed = snapshot(input.merchants, cutDate);
  const sourceFilename = `planning-report__dealer-infinity-pay_${cutFilenamePart(input.cutAt)}.xlsx`;

  const accepted = await acceptReport(db, {
    contentSha256: createHash("sha256").update(`seed:${cutDate}`).digest("hex"),
    cutAt: input.cutAt,
    storageKey: `seed/${sourceFilename}`,
    sourceFilename,
    uploadedBy: input.uploader,
    now: input.now,
  });

  if (accepted.kind === "duplicate") {
    return;
  }

  let rowsApplied = 0;
  let rowsFailed = parsed.rejections.length;
  let conflicts = 0;
  let needsReview = 0;

  await insertRejections(db, accepted.reportId, parsed.rejections);

  for (const batch of batchByRuc(parsed.rows, SEED_BATCH_TARGET_ROWS)) {
    // eslint-disable-next-line no-await-in-loop
    const written = await writeFactsBatch(db, {
      reportId: accepted.reportId,
      cutAt: input.cutAt,
      rows: batch,
      now: input.now,
    });

    // eslint-disable-next-line no-await-in-loop
    const derived = await recomputeAttribution(db, written.touched, input.now);

    rowsApplied += written.rowsApplied;
    rowsFailed += written.rowsRejected;
    conflicts += derived.conflicts;
    needsReview += derived.needsReview;
  }

  await db
    .updateTable("merchant_report_imports")
    .set({
      queue_state: "done",
      rows_total: parsed.rows.length + parsed.rejections.length,
      rows_applied: rowsApplied,
      rows_failed: rowsFailed,
      results_json: JSON.stringify({
        reportId: accepted.reportId,
        conflicts,
        needsReview,
      }),
      completed_at: input.now,
    })
    .where("id", "=", accepted.importId)
    .execute();
}

async function persistTargets(
  db: Kysely<Database>,
  merchants: readonly MerchantSpec[],
  context: SeedContext,
): Promise<void> {
  const setAt = daysBefore(context, 30);
  const byRuc = new Map<string, MerchantSpec>();

  for (const merchant of merchants) {
    if (merchant.projectedGpv != null && !byRuc.has(merchant.ruc)) {
      byRuc.set(merchant.ruc, merchant);
    }
  }

  for (const merchant of byRuc.values()) {
    // Start at the sale month so ramping months are not marked as no_target.
    // eslint-disable-next-line no-await-in-loop
    await setTarget(db, {
      ruc: merchant.ruc,
      effectiveFrom: merchant.saleMonth,
      projectedGpv: merchant.projectedGpv,
      setBy: VALERIA,
      now: setAt,
    });
  }
}

function snapshot(
  merchants: readonly MerchantSpec[],
  cutDate: string,
): ParsedReport {
  const rows: SourceRow[] = [];

  for (const merchant of merchants) {
    if (merchant.soldAt > cutDate) {
      continue;
    }

    rows.push(toSourceRow(merchant, rows.length + 1, cutDate));
  }

  return {
    rows,
    rejections: [],
  };
}

const SERIAL_OVERRIDES_BY_LEAD_KEY: Record<string, string> = {
  "live-andes": MERCHANT_STATS_SERIAL_LINKS.ANDES,
  "live-aurora": MERCHANT_STATS_SERIAL_LINKS.AURORA,

  // Different from the fulfillment serial to produce a mismatch.
  "live-boreal-norte": MERCHANT_STATS_SERIAL_LINKS.BOREAL_NORTE_CULQI,
};

function linkableOrganizations(): Array<{
  ruc: string;
  legalName: string;
  tradeName: string | null;
  serialOverride?: string;
}> {
  return LEAD_SPECS.slice(0, PROFILE.linkedOrganizationLimit).map((spec) => ({
    ruc: spec.org.ruc,
    legalName: spec.org.legalName,
    tradeName: spec.venue?.tradeName ?? null,
    serialOverride: SERIAL_OVERRIDES_BY_LEAD_KEY[spec.key],
  }));
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function cutFilenamePart(cutAt: Date): string {
  return [
    pad(cutAt.getUTCDate()),
    pad(cutAt.getUTCMonth() + 1),
    pad(cutAt.getUTCFullYear() % 100),
    `C1-${pad(cutAt.getUTCHours())}_${pad(cutAt.getUTCMinutes())}`,
  ].join("_");
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
