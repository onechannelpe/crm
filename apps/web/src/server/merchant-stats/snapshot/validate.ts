import type { Insertable } from "kysely";

import type { GpvSnapshotId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { Database } from "~/server/platform/database/types";

import { chunks } from "../chunks";

const ISSUE_CHUNK = 750;
type IssueInsert = Insertable<Database["gpv_snapshot_issues"]>;

export async function validateGpvSnapshot(
  db: DatabaseExecutor,
  snapshotId: GpvSnapshotId,
  validatedAt: Date,
): Promise<{ blocking: number; warnings: number }> {
  if (db.isTransaction) {
    return validateInTransaction(db, snapshotId, validatedAt);
  }

  return db
    .transaction()
    .execute((tx) => validateInTransaction(tx, snapshotId, validatedAt));
}

async function validateInTransaction(
  db: DatabaseExecutor,
  snapshotId: GpvSnapshotId,
  validatedAt: Date,
): Promise<{ blocking: number; warnings: number }> {
  await db
    .selectFrom("merchant_gpv_dataset")
    .select("id")
    .where("id", "=", "default")
    .forUpdate()
    .executeTakeFirstOrThrow();

  const snapshot = await db
    .selectFrom("gpv_snapshots")
    .select("state")
    .where("id", "=", snapshotId)
    .forUpdate()
    .executeTakeFirstOrThrow();

  if (snapshot.state !== "processing" && snapshot.state !== "needs_review") {
    throw new Error(`Cannot validate GPV snapshot in state ${snapshot.state}`);
  }

  const active = await db
    .selectFrom("gpv_snapshots")
    .select("id")
    .where("state", "=", "active")
    .executeTakeFirst();
  const issues = [
    ...(active
      ? await compareSnapshots(db, active.id, snapshotId, validatedAt)
      : []),
    ...(await findCrmWarnings(db, snapshotId, validatedAt)),
  ];

  for (const chunk of chunks(issues, ISSUE_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    await db
      .insertInto("gpv_snapshot_issues")
      .values(chunk)
      .onConflict((oc) => oc.columns(["snapshot_id", "issue_key"]).doNothing())
      .execute();
  }

  const counts = await db
    .selectFrom("gpv_snapshot_issues")
    .select((eb) => [
      eb.fn
        .count<number>("id")
        .filterWhere("severity", "=", "blocking")
        .filterWhere("status", "=", "open")
        .as("blocking"),
      eb.fn
        .count<number>("id")
        .filterWhere("severity", "=", "warning")
        .filterWhere("status", "=", "open")
        .as("warnings"),
    ])
    .where("snapshot_id", "=", snapshotId)
    .executeTakeFirstOrThrow();

  await db
    .updateTable("gpv_snapshots")
    .set({ state: counts.blocking > 0 ? "needs_review" : "ready" })
    .where("id", "=", snapshotId)
    .execute();

  return counts;
}

async function compareSnapshots(
  db: DatabaseExecutor,
  previousSnapshotId: GpvSnapshotId,
  candidateSnapshotId: GpvSnapshotId,
  createdAt: Date,
): Promise<IssueInsert[]> {
  const [previous, candidate] = await Promise.all([
    loadPlacementComparisonRows(db, previousSnapshotId),
    loadPlacementComparisonRows(db, candidateSnapshotId),
  ]);
  const previousByKey = new Map(
    previous.map((row) => [row.placement_key, row]),
  );
  const candidateByKey = new Map(
    candidate.map((row) => [row.placement_key, row]),
  );
  const issues: IssueInsert[] = [];

  for (const [key, oldPlacement] of previousByKey) {
    const nextPlacement = candidateByKey.get(key);

    if (!nextPlacement) {
      issues.push({
        snapshot_id: candidateSnapshotId,
        issue_key: `missing:${key}`,
        issue_type: "placement_missing",
        entity_key: key,
        severity: "blocking",
        detail:
          "La colocación estaba en el corte anterior y falta en el nuevo.",
        previous_value: JSON.stringify(oldPlacement),
        candidate_value: null,
        created_at: createdAt,
      });
      continue;
    }

    if (oldPlacement.ruc !== nextPlacement.ruc) {
      issues.push({
        snapshot_id: candidateSnapshotId,
        issue_key: `ruc:${key}`,
        issue_type: "placement_ruc_changed",
        entity_key: key,
        severity: "blocking",
        detail: "La colocación cambió de RUC entre cortes.",
        previous_value: JSON.stringify({ ruc: oldPlacement.ruc }),
        candidate_value: JSON.stringify({ ruc: nextPlacement.ruc }),
        created_at: createdAt,
      });
    }

    if (oldPlacement.sale_month !== nextPlacement.sale_month) {
      issues.push({
        snapshot_id: candidateSnapshotId,
        issue_key: `sale-month:${key}`,
        issue_type: "sale_month_changed",
        entity_key: key,
        severity: "blocking",
        detail: "La colocación cambió de mes de venta entre cortes.",
        previous_value: JSON.stringify({ saleMonth: oldPlacement.sale_month }),
        candidate_value: JSON.stringify({
          saleMonth: nextPlacement.sale_month,
        }),
        created_at: createdAt,
      });
    }
  }

  return issues;
}

function loadPlacementComparisonRows(
  db: DatabaseExecutor,
  snapshotId: GpvSnapshotId,
) {
  return db
    .selectFrom("gpv_snapshot_placements")
    .select(["placement_key", "ruc", "sale_month"])
    .where("snapshot_id", "=", snapshotId)
    .execute();
}

async function findCrmWarnings(
  db: DatabaseExecutor,
  snapshotId: GpvSnapshotId,
  createdAt: Date,
): Promise<IssueInsert[]> {
  const rows = await db
    .selectFrom("gpv_snapshot_placements as placement")
    .leftJoin(
      "organizations as organization",
      "organization.ruc",
      "placement.ruc",
    )
    .leftJoin(
      "organization_current_owners as owner",
      "owner.organization_id",
      "organization.id",
    )
    .select([
      "placement.ruc",
      "organization.id as organization_id",
      "owner.executive_id",
    ])
    .where("placement.snapshot_id", "=", snapshotId)
    .distinct()
    .execute();

  return rows.flatMap((row): IssueInsert[] => {
    if (!row.organization_id) {
      return [
        {
          snapshot_id: snapshotId,
          issue_key: `crm-ruc:${row.ruc}`,
          issue_type: "crm_ruc_missing",
          entity_key: row.ruc,
          severity: "warning",
          detail: "El RUC no existe todavía en CRM.",
          previous_value: null,
          candidate_value: JSON.stringify({ ruc: row.ruc }),
          created_at: createdAt,
        },
      ];
    }
    if (!row.executive_id) {
      return [
        {
          snapshot_id: snapshotId,
          issue_key: `crm-owner:${row.ruc}`,
          issue_type: "crm_owner_missing",
          entity_key: row.ruc,
          severity: "warning",
          detail: "El RUC no tiene un ejecutivo actual en CRM.",
          previous_value: null,
          candidate_value: JSON.stringify({ ruc: row.ruc }),
          created_at: createdAt,
        },
      ];
    }

    return [];
  });
}
