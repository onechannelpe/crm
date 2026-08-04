import { fail, type DomainError } from "~/domain/errors";
import type { GpvSnapshotId, GpvSnapshotIssueId, UserId } from "~/domain/ids";
import type { GpvSnapshotIssueResolution } from "~/domain/merchant-stats/snapshot";
import { appendEvents } from "~/server/event-logs/events-repo";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { OperationContext } from "~/server/platform/operation/context";
import { Err, Ok, type Result } from "~/shared/result";

import { activateGpvSnapshotInTransaction } from "./activate";
import { validateGpvSnapshotInTransaction } from "./validate";

export interface ResolveGpvSnapshotIssueInput {
  issueId: GpvSnapshotIssueId;
  resolution: GpvSnapshotIssueResolution;
  resolvedBy: UserId;
  operation: OperationContext;
}

export async function resolveGpvSnapshotIssue(
  db: DatabaseExecutor,
  input: ResolveGpvSnapshotIssueInput,
): Promise<Result<{ activated: boolean }, DomainError>> {
  return db.transaction().execute(async (tx) => {
    await tx
      .selectFrom("merchant_gpv_dataset")
      .select("id")
      .where("id", "=", "default")
      .forUpdate()
      .executeTakeFirstOrThrow();

    const issue = await tx
      .selectFrom("gpv_snapshot_issues")
      .innerJoin(
        "gpv_snapshots as snapshot",
        "snapshot.id",
        "gpv_snapshot_issues.snapshot_id",
      )
      .select([
        "gpv_snapshot_issues.id",
        "gpv_snapshot_issues.snapshot_id",
        "gpv_snapshot_issues.entity_key",
        "gpv_snapshot_issues.issue_type",
        "gpv_snapshot_issues.status",
        "snapshot.state",
      ])
      .where("gpv_snapshot_issues.id", "=", input.issueId)
      .forUpdate()
      .executeTakeFirst();

    if (!issue) {
      return Err(fail("gpv_snapshot_issue_not_found"));
    }
    if (issue.status === "resolved") {
      if (issue.state !== "ready") {
        return Ok({
          activated: issue.state === "active" || issue.state === "superseded",
        });
      }

      const activated = await activateGpvSnapshotInTransaction(tx, {
        snapshotId: issue.snapshot_id,
        activatedBy: input.resolvedBy,
        activatedAt: input.operation.operationAt,
      });

      return activated.ok ? Ok({ activated: true }) : activated;
    }
    if (issue.state !== "needs_review") {
      return Err(fail("gpv_snapshot_issue_not_resolvable"));
    }
    if (!isResolutionAllowed(issue.issue_type, input.resolution)) {
      return Err(fail("gpv_snapshot_resolution_invalid"));
    }

    if (input.resolution === "reject_snapshot") {
      await tx
        .updateTable("gpv_snapshots")
        .set({ state: "rejected" })
        .where("id", "=", issue.snapshot_id)
        .execute();
    } else if (input.resolution === "keep_previous") {
      const copied = await copyPreviousPlacement(
        tx,
        issue.snapshot_id,
        issue.entity_key,
      );
      if (!copied) {
        return Err(fail("gpv_snapshot_previous_placement_not_found"));
      }
    } else if (input.resolution === "exclude_candidate") {
      if (!issue.entity_key && issue.issue_type !== "row_rejected") {
        return Err(fail("gpv_snapshot_issue_has_no_placement"));
      }
      if (issue.entity_key) {
        await tx
          .deleteFrom("gpv_snapshot_placements")
          .where("snapshot_id", "=", issue.snapshot_id)
          .where("placement_key", "=", issue.entity_key)
          .execute();
      }
    }

    await tx
      .updateTable("gpv_snapshot_issues")
      .set({
        status: "resolved",
        resolution: input.resolution,
        resolved_by: input.resolvedBy,
        resolved_at: input.operation.operationAt,
      })
      .where("id", "=", issue.id)
      .execute();
    await appendEvents(tx, {
      entityType: "gpv_snapshot",
      entityId: issue.snapshot_id,
      type: "gpv_snapshot_issue_resolved",
      actorUserId: input.resolvedBy,
      payload: {
        issueId: issue.id,
        resolution: input.resolution,
      },
      occurredAt: input.operation.operationAt,
    });

    if (input.resolution === "reject_snapshot") {
      return Ok({ activated: false });
    }

    const validation = await validateGpvSnapshotInTransaction(
      tx,
      issue.snapshot_id,
      input.operation.operationAt,
    );

    if (validation.blocking > 0) {
      return Ok({ activated: false });
    }

    const activated = await activateGpvSnapshotInTransaction(tx, {
      snapshotId: issue.snapshot_id,
      activatedBy: input.resolvedBy,
      activatedAt: input.operation.operationAt,
    });

    return activated.ok ? Ok({ activated: true }) : activated;
  });
}

async function copyPreviousPlacement(
  tx: DatabaseExecutor,
  candidateSnapshotId: GpvSnapshotId,
  placementKey: string | null,
): Promise<boolean> {
  if (!placementKey) {
    return false;
  }

  const active = await tx
    .selectFrom("gpv_snapshots")
    .select("id")
    .where("state", "=", "active")
    .executeTakeFirst();

  if (!active) {
    return false;
  }

  const previous = await tx
    .selectFrom("gpv_snapshot_placements")
    .selectAll()
    .where("snapshot_id", "=", active.id)
    .where("placement_key", "=", placementKey)
    .executeTakeFirst();

  if (!previous) {
    return false;
  }

  await tx
    .deleteFrom("gpv_snapshot_placements")
    .where("snapshot_id", "=", candidateSnapshotId)
    .where("placement_key", "=", placementKey)
    .execute();

  const inserted = await tx
    .insertInto("gpv_snapshot_placements")
    .values({
      snapshot_id: candidateSnapshotId,
      row_number: previous.row_number,
      placement_key: previous.placement_key,
      merchant_id: previous.merchant_id,
      product: previous.product,
      serial_number: previous.serial_number,
      ruc: previous.ruc,
      sold_at: previous.sold_at,
      sale_month: previous.sale_month,
      trade_name: previous.trade_name,
      legal_name: previous.legal_name,
      culqi_user_code: previous.culqi_user_code,
      culqi_user_name: previous.culqi_user_name,
      mesa: previous.mesa,
      channel: previous.channel,
      subchannel: previous.subchannel,
      offer_amount: previous.offer_amount,
      promotion: previous.promotion,
      client_type: previous.client_type,
      stock_type: previous.stock_type,
      trial_at: previous.trial_at,
      activated_at: previous.activated_at,
      last_transaction_at: previous.last_transaction_at,
      m0_plus_15d_gpv: previous.m0_plus_15d_gpv,
      m0_plus_15d_trx: previous.m0_plus_15d_trx,
      raw: previous.raw,
    })
    .returning("id")
    .executeTakeFirst();

  if (!inserted) {
    return true;
  }

  const observations = await tx
    .selectFrom("gpv_snapshot_observations")
    .select(["month_offset", "sale_month", "gpv", "trx"])
    .where("snapshot_id", "=", active.id)
    .where("placement_id", "=", previous.id)
    .execute();

  if (observations.length > 0) {
    await tx
      .insertInto("gpv_snapshot_observations")
      .values(
        observations.map((observation) => ({
          snapshot_id: candidateSnapshotId,
          placement_id: inserted.id,
          month_offset: observation.month_offset,
          sale_month: observation.sale_month,
          gpv: observation.gpv,
          trx: observation.trx,
        })),
      )
      .execute();
  }

  return true;
}

function isResolutionAllowed(
  issueType: string,
  resolution: GpvSnapshotIssueResolution,
): boolean {
  if (resolution === "reject_snapshot") {
    return true;
  }

  switch (issueType) {
    case "row_rejected":
      return resolution === "exclude_candidate";
    case "placement_missing":
      return (
        resolution === "keep_previous" || resolution === "accept_candidate"
      );
    case "placement_ruc_changed":
    case "sale_month_changed":
      return (
        resolution === "keep_previous" ||
        resolution === "accept_candidate" ||
        resolution === "exclude_candidate"
      );
    default:
      return false;
  }
}
