import type { Transaction } from "kysely";

import { fail, type DomainError } from "~/domain/errors";
import type { GpvSnapshotId, UserId } from "~/domain/ids";
import { createEventsWriter } from "~/server/event-logs/events-repo";
import {
  isTransactionExecutor,
  type DatabaseExecutor,
} from "~/server/platform/database/executor";
import type { Database } from "~/server/platform/database/types";
import { Err, Ok, type Result } from "~/shared/result";

import { freezeUncreditedMerchantMonths } from "../credit/freeze";

export interface ActivateGpvSnapshotInput {
  snapshotId: GpvSnapshotId;
  activatedBy: UserId;
  activatedAt: Date;
}

export async function activateGpvSnapshot(
  db: DatabaseExecutor,
  input: ActivateGpvSnapshotInput,
): Promise<Result<void, DomainError>> {
  if (isTransactionExecutor(db)) {
    return activateGpvSnapshotInTransaction(db, input);
  }

  return db
    .transaction()
    .execute((tx) => activateGpvSnapshotInTransaction(tx, input));
}

export async function activateGpvSnapshotInTransaction(
  tx: Transaction<Database>,
  input: ActivateGpvSnapshotInput,
): Promise<Result<void, DomainError>> {
  await tx
    .selectFrom("merchant_gpv_dataset")
    .select("id")
    .where("id", "=", "default")
    .forUpdate()
    .executeTakeFirstOrThrow();

  const snapshot = await tx
    .selectFrom("gpv_snapshots")
    .select(["id", "cut_at", "revision", "state"])
    .where("id", "=", input.snapshotId)
    .forUpdate()
    .executeTakeFirst();

  if (!snapshot) {
    return Err(fail("gpv_snapshot_not_found"));
  }
  if (snapshot.state === "active") {
    return Ok(undefined);
  }
  if (snapshot.state !== "ready") {
    return Err(fail("gpv_snapshot_not_activatable"));
  }

  const active = await tx
    .selectFrom("gpv_snapshots")
    .select(["id", "cut_at", "revision"])
    .where("state", "=", "active")
    .executeTakeFirst();

  if (active && isLaterSnapshot(active, snapshot)) {
    await tx
      .updateTable("gpv_snapshots")
      .set({ state: "rejected" })
      .where("id", "=", snapshot.id)
      .execute();

    return Err(fail("gpv_snapshot_superseded"));
  }

  await freezeUncreditedMerchantMonths(tx, {
    snapshotId: snapshot.id,
    cutAt: snapshot.cut_at,
    creditedAt: input.activatedAt,
  });
  if (active) {
    await tx
      .updateTable("gpv_snapshots")
      .set({ state: "superseded" })
      .where("id", "=", active.id)
      .execute();
  }
  await tx
    .updateTable("merchant_gpv_dataset")
    .set({ updated_at: input.activatedAt })
    .where("id", "=", "default")
    .execute();
  await tx
    .updateTable("gpv_snapshots")
    .set({
      state: "active",
      activated_by: input.activatedBy,
      activated_at: input.activatedAt,
    })
    .where("id", "=", snapshot.id)
    .execute();
  await createEventsWriter(tx).append({
    entityType: "gpv_snapshot",
    entityId: snapshot.id,
    type: "gpv_snapshot_activated",
    actorUserId: input.activatedBy,
    payload: {
      cutAt: snapshot.cut_at.toISOString(),
      revision: snapshot.revision,
    },
    occurredAt: input.activatedAt,
  });

  return Ok(undefined);
}

function isLaterSnapshot(
  left: { cut_at: Date; revision: number },
  right: { cut_at: Date; revision: number },
): boolean {
  if (left.cut_at.getTime() !== right.cut_at.getTime()) {
    return left.cut_at > right.cut_at;
  }

  return left.revision > right.revision;
}
