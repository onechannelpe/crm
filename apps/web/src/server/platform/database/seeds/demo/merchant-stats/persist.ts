import type { Transaction } from "kysely";

import type { UserId } from "~/domain/ids";
import {
  calendarDateFromParts,
  type CalendarDate,
} from "~/domain/time/calendar-date";
import { setTargetInTransaction } from "~/server/merchant-stats/commands/set-target";
import type {
  ParsedReport,
  SourceRow,
} from "~/server/merchant-stats/intake/types";
import { activateGpvSnapshotInTransaction } from "~/server/merchant-stats/snapshot/activate";
import { stageGpvSnapshot } from "~/server/merchant-stats/snapshot/stage";
import { validateGpvSnapshotInTransaction } from "~/server/merchant-stats/snapshot/validate";
import type { Database } from "~/server/platform/database/types";

import { daysBefore, type SeedContext } from "../../shared/context";
import { VALERIA } from "../demo-ids";
import { LEAD_SPECS, MERCHANT_STATS_SERIAL_LINKS } from "../scenario";
import { generateMerchants, toSourceRow, type MerchantSpec } from "./generator";
import { CULQI_MERCHANT_REPORT_PROFILE as PROFILE } from "./profile";

export async function persistDemoMerchantStats(
  db: Transaction<Database>,
  context: SeedContext,
): Promise<void> {
  const linkedOrganizations = linkableOrganizations();
  const merchants = generateMerchants({
    context,
    linkedOrganizations,
    totalMerchants: PROFILE.merchantCount,
  });

  await applySnapshot(db, {
    uploader: VALERIA,
    uploadedAt: daysBefore(context, 40),
    cutAt: daysBefore(context, 51),
    merchants,
  });

  await applySnapshot(db, {
    uploader: VALERIA,
    uploadedAt: daysBefore(context, 1),
    cutAt: daysBefore(context, 11),
    merchants,
  });

  await persistTargets(
    db,
    merchants,
    new Set(linkedOrganizations.map(({ ruc }) => ruc)),
    context,
  );
}

interface SnapshotInput {
  uploader: UserId;
  uploadedAt: Date;
  cutAt: Date;
  merchants: readonly MerchantSpec[];
}

async function applySnapshot(
  db: Transaction<Database>,
  input: SnapshotInput,
): Promise<void> {
  const cutDate = isoDate(input.cutAt);
  const parsed = snapshot(input.merchants, cutDate);
  const sourceFilename = `planning-report__dealer-infinity-pay_${cutFilenamePart(input.cutAt)}.xlsx`;
  const file = await db
    .insertInto("file_assets")
    .values({
      storage_key: `seed/${sourceFilename}`,
      purpose: "merchant_gpv_snapshot",
      original_filename: sourceFilename,
      safe_display_filename: sourceFilename,
      detected_mime:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      extension: "xlsx",
      size_bytes: 0,
      sha256_hex: `seed-${cutDate}`,
      signature_kind: "zip",
      scan_status: "clean",
      created_by_user_id: input.uploader,
      created_at: input.uploadedAt,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  const snapshotRow = await db
    .insertInto("gpv_snapshots")
    .values({
      file_asset_id: file.id,
      cut_at: input.cutAt,
      revision: 1,
      uploaded_at: input.uploadedAt,
      state: "processing",
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  await stageGpvSnapshot(db, snapshotRow.id, parsed, input.uploadedAt);
  const issues = await validateGpvSnapshotInTransaction(
    db,
    snapshotRow.id,
    input.uploadedAt,
  );
  if (issues.blocking > 0) {
    throw new Error("demo_gpv_snapshot_requires_review");
  }

  const activated = await activateGpvSnapshotInTransaction(db, {
    snapshotId: snapshotRow.id,
    activatedBy: input.uploader,
    activatedAt: input.uploadedAt,
  });
  if (!activated.ok) {
    throw new Error(activated.error.code ?? "gpv_snapshot_activation_failed");
  }
}

async function persistTargets(
  db: Transaction<Database>,
  merchants: readonly MerchantSpec[],
  targetableRucs: ReadonlySet<string>,
  context: SeedContext,
): Promise<void> {
  const setAt = daysBefore(context, 30);
  const byRuc = new Map<string, MerchantSpec>();

  for (const merchant of merchants) {
    if (!targetableRucs.has(merchant.ruc)) {
      continue;
    }
    if (merchant.projectedGpv != null && !byRuc.has(merchant.ruc)) {
      byRuc.set(merchant.ruc, merchant);
    }
  }

  for (const merchant of byRuc.values()) {
    // Start at the sale month so ramping months are not marked as no_target.
    // eslint-disable-next-line no-await-in-loop
    const target = await setTargetInTransaction(db, {
      ruc: merchant.ruc,
      effectiveFrom: merchant.saleMonth,
      projectedGpv: merchant.projectedGpv,
      setBy: VALERIA,
      operation: { operationAt: setAt },
    });
    if (!target.ok) {
      throw new Error(target.error.code ?? "merchant_target_seed_failed");
    }
  }
}

function snapshot(
  merchants: readonly MerchantSpec[],
  cutDate: CalendarDate,
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

function isoDate(date: Date): CalendarDate {
  return calendarDateFromParts({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}
