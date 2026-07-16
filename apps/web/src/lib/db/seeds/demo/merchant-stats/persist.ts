import { createHash } from "node:crypto";

import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { applyReport } from "~/server/merchant-stats/apply/apply-report";
import { acceptReport } from "~/server/merchant-stats/commands/accept-report";
import { setTarget } from "~/server/merchant-stats/commands/set-target";
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

// Two cuts of the same dealer export, six weeks apart. The second restates the
// first: later cohort months fill in, and merchants sold in between appear.
//
// Both are the raw export. There is no second kind of file -- the hand-enriched
// "GPV AL" workbook the team used to maintain is exactly what this pipeline
// replaces, so seeding it would be seeding the problem.
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
    // The seed never sees a real file, so the hash stands in for one. It must
    // still be stable and distinct per cut, or the second snapshot would be
    // rejected as a duplicate of the first -- which is the guard working.
    contentSha256: createHash("sha256").update(`seed:${cutDate}`).digest("hex"),
    cutAt: input.cutAt,
    storageKey: `seed/${sourceFilename}`,
    sourceFilename,
    uploadedBy: input.uploader,
    now: input.now,
  });

  if (accepted.kind === "duplicate") return;

  const result = await applyReport(
    { reportId: accepted.reportId, cutAt: input.cutAt, parsed },
    { db, now: input.now },
  );

  await db
    .updateTable("workflow_integration_jobs")
    .set({
      status: "COMPLETED",
      queue_state: "done",
      rows_total: result.rowsTotal,
      rows_applied: result.rowsValid,
      rows_failed: result.rowsRejected,
      results_json: JSON.stringify({
        reportId: accepted.reportId,
        conflicts: result.conflicts,
        needsReview: result.needsReview,
      }),
      completed_at: input.now,
    })
    .where("id", "=", accepted.jobId)
    .execute();
}

// The projection is a human's number, so the seed writes it the way a human
// does: one effective-dated version per merchant, not a column on the import.
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
    // Effective from the merchant's own first month, so every month it ramps is
    // measured against a number rather than showing up as no_target.
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

// A snapshot only carries merchants that existed by its cut date.
function snapshot(
  merchants: readonly MerchantSpec[],
  cutDate: string,
): ParsedReport {
  const rows: SourceRow[] = [];
  for (const merchant of merchants) {
    if (merchant.soldAt > cutDate) continue;
    rows.push(toSourceRow(merchant, rows.length + 1, cutDate));
  }
  return { rows, rejections: [] };
}

// Keyed by lead key rather than RUC digits so the intent stays legible: these
// are the three leads whose completed fulfillment order carries a real
// serial, wired here to the merchant device that same RUC realizes GPV on.
// live-andes and live-aurora line up exactly (the "exact" confidence
// candidates); live-boreal-norte deliberately does not (the "serial_mismatch"
// candidate) -- see MERCHANT_STATS_SERIAL_LINKS for the paired values.
const SERIAL_OVERRIDES_BY_LEAD_KEY: Record<string, string> = {
  "live-andes": MERCHANT_STATS_SERIAL_LINKS.ANDES,
  "live-aurora": MERCHANT_STATS_SERIAL_LINKS.AURORA,
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

// Matches the dealer's naming, which is what cutAtFromFilename reads.
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
