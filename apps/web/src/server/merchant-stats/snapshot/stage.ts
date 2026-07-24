import type { Insertable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  GpvSnapshotId,
  GpvSnapshotPlacementId,
} from "~/server/shared/ids";

import { chunks } from "../chunks";
import { saleIdentityKey } from "../intake/sale-identity";
import type { ParsedReport, Rejection, SourceRow } from "../intake/types";

const PLACEMENT_CHUNK = 750;
const OBSERVATION_CHUNK = 3000;
const ISSUE_CHUNK = 750;

type PlacementInsert = Insertable<Database["gpv_snapshot_placements"]>;
type ObservationInsert = Insertable<Database["gpv_snapshot_observations"]>;

export interface StagedGpvSnapshot {
  rowsTotal: number;
  rowsApplied: number;
  rowsFailed: number;
}

export async function stageGpvSnapshot(
  db: DatabaseExecutor,
  snapshotId: GpvSnapshotId,
  report: ParsedReport,
  now: Date,
): Promise<StagedGpvSnapshot> {
  const snapshot = await db
    .selectFrom("gpv_snapshots")
    .select("state")
    .where("id", "=", snapshotId)
    .forUpdate()
    .executeTakeFirstOrThrow();

  if (snapshot.state !== "processing") {
    throw new Error(`Cannot stage GPV snapshot in state ${snapshot.state}`);
  }

  await db
    .deleteFrom("gpv_snapshot_issues")
    .where("snapshot_id", "=", snapshotId)
    .execute();
  await db
    .deleteFrom("gpv_snapshot_placements")
    .where("snapshot_id", "=", snapshotId)
    .execute();

  const placementIdByKey = await insertPlacements(db, snapshotId, report.rows);
  await insertObservations(db, snapshotId, report.rows, placementIdByKey);
  await insertParseIssues(db, snapshotId, report.rejections, now);

  return {
    rowsTotal: report.rows.length + report.rejections.length,
    rowsApplied: report.rows.length,
    rowsFailed: report.rejections.length,
  };
}

async function insertPlacements(
  db: DatabaseExecutor,
  snapshotId: GpvSnapshotId,
  rows: readonly SourceRow[],
): Promise<Map<string, GpvSnapshotPlacementId>> {
  const idByKey = new Map<string, GpvSnapshotPlacementId>();

  const placements = rows.map((row) => toPlacement(snapshotId, row));

  for (const chunk of chunks(placements, PLACEMENT_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    const inserted = await db
      .insertInto("gpv_snapshot_placements")
      .values(chunk)
      .returning(["id", "placement_key"])
      .execute();

    for (const placement of inserted) {
      idByKey.set(placement.placement_key, placement.id);
    }
  }

  return idByKey;
}

function toPlacement(
  snapshotId: GpvSnapshotId,
  row: SourceRow,
): PlacementInsert {
  return {
    snapshot_id: snapshotId,
    row_number: row.rowNumber,
    placement_key: saleIdentityKey(
      row.merchantId,
      row.product,
      row.serialNumber,
    ),
    merchant_id: row.merchantId,
    product: row.product,
    serial_number: row.serialNumber,
    ruc: row.ruc,
    sold_at: row.soldAt,
    sale_month: `${row.saleMonth}-01`,
    trade_name: row.tradeName,
    legal_name: row.legalName,
    culqi_user_code: row.culqiUserCode,
    culqi_user_name: row.culqiUserName,
    mesa: row.mesa,
    channel: row.channel,
    subchannel: row.subchannel,
    offer_amount: row.offerAmount,
    promotion: row.promotion,
    client_type: row.clientType,
    stock_type: row.stockType,
    trial_at: row.trialAt,
    activated_at: row.activatedAt,
    last_transaction_at: row.lastTransactionAt,
    m0_plus_15d_gpv: row.m0Plus15dGpv,
    m0_plus_15d_trx: row.m0Plus15dTrx,
    raw: JSON.stringify(row.raw),
  };
}

async function insertObservations(
  db: DatabaseExecutor,
  snapshotId: GpvSnapshotId,
  rows: readonly SourceRow[],
  placementIdByKey: ReadonlyMap<string, GpvSnapshotPlacementId>,
): Promise<void> {
  const values: ObservationInsert[] = [];

  for (const row of rows) {
    const key = saleIdentityKey(row.merchantId, row.product, row.serialNumber);
    const placementId = placementIdByKey.get(key);

    if (!placementId) {
      throw new Error(`Staged placement missing for ${key}`);
    }

    for (const observation of row.gpv) {
      values.push({
        snapshot_id: snapshotId,
        placement_id: placementId,
        month_offset: observation.offset,
        sale_month: `${row.saleMonth}-01`,
        gpv: observation.gpv,
        trx: observation.trx,
      });
    }
  }

  for (const chunk of chunks(values, OBSERVATION_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    await db.insertInto("gpv_snapshot_observations").values(chunk).execute();
  }
}

async function insertParseIssues(
  db: DatabaseExecutor,
  snapshotId: GpvSnapshotId,
  rejections: readonly Rejection[],
  now: Date,
): Promise<void> {
  const values = rejections.map((rejection) => ({
    snapshot_id: snapshotId,
    issue_key: `parse:${rejection.rowNumber}`,
    issue_type: "row_rejected",
    entity_key: null,
    severity: "blocking" as const,
    detail: rejection.reason,
    previous_value: null,
    candidate_value: JSON.stringify(rejection.raw),
    created_at: now,
  }));

  for (const chunk of chunks(values, ISSUE_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    await db.insertInto("gpv_snapshot_issues").values(chunk).execute();
  }
}
