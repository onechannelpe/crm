import { sql } from "kysely";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { GpvSnapshotId } from "~/server/shared/ids";

export async function freezeUncreditedMerchantMonths(
  tx: DatabaseExecutor,
  input: {
    snapshotId: GpvSnapshotId;
    cutAt: Date;
    creditedAt: Date;
  },
): Promise<void> {
  const observedMonths = tx
    .selectFrom("gpv_snapshot_placements as placement")
    .innerJoin("gpv_snapshot_observations as observation", (join) =>
      join
        .onRef("observation.snapshot_id", "=", "placement.snapshot_id")
        .onRef("observation.placement_id", "=", "placement.id"),
    )
    .select((eb) => [
      "placement.ruc",
      "observation.realized_month as month",
      sql<Date>`least(
        ${input.cutAt},
        ${eb.ref("observation.realized_month")}
          + interval '1 month'
          - interval '1 microsecond'
      )`.as("credit_instant"),
    ])
    .where("placement.snapshot_id", "=", input.snapshotId)
    .distinct()
    .as("observed");

  await tx
    .insertInto("merchant_month_credits")
    .columns([
      "ruc",
      "month",
      "organization_id",
      "seller_user_id",
      "branch_id",
      "first_snapshot_id",
      "credited_at",
    ])
    .expression((query) =>
      query
        .selectFrom(observedMonths)
        .innerJoin(
          "organizations as organization",
          "organization.ruc",
          "observed.ruc",
        )
        .innerJoinLateral(
          (ownerQuery) =>
            ownerQuery
              .selectFrom("organization_owner_assignments as assignment")
              .select("assignment.executive_id")
              .whereRef("assignment.organization_id", "=", "organization.id")
              .whereRef(
                "assignment.valid_from",
                "<=",
                "observed.credit_instant",
              )
              .where((condition) =>
                condition.or([
                  condition("assignment.valid_until", "is", null),
                  condition(
                    "assignment.valid_until",
                    ">",
                    condition.ref("observed.credit_instant"),
                  ),
                ]),
              )
              .orderBy("assignment.valid_from", "desc")
              .limit(1)
              .as("owner"),
          (join) => join.onTrue(),
        )
        .innerJoin("users as app_user", "app_user.id", "owner.executive_id")
        .select((selection) => [
          "observed.ruc",
          "observed.month",
          "organization.id",
          "owner.executive_id",
          "app_user.branch_id",
          selection.val(input.snapshotId).as("first_snapshot_id"),
          selection.val(input.creditedAt).as("credited_at"),
        ]),
    )
    .onConflict((oc) => oc.columns(["ruc", "month"]).doNothing())
    .execute();
}
