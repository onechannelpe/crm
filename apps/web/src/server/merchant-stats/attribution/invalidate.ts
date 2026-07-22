import { notify } from "~/lib/db/notify";
import { JOB_TABLE_CHANNELS } from "~/lib/job-queue/registry";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { WorkflowLeadId } from "~/server/shared/ids";

export async function enqueueAttributionForLead(
  db: DatabaseExecutor,
  leadId: WorkflowLeadId,
  now: Date,
): Promise<void> {
  const affected = await db
    .insertInto("merchant_attribution_jobs")
    .columns(["ruc", "month", "claimable_at", "created_at"])
    .expression((eb) =>
      eb
        .selectFrom("workflow_leads as l")
        .innerJoin("organizations as o", "o.id", "l.organization_id")
        .innerJoin("merchant_monthly_gpv as m", "m.ruc", "o.ruc")
        .where("l.id", "=", leadId)
        .select((seb) => [
          "o.ruc",
          "m.month",
          seb.val(now).as("claimable_at"),
          seb.val(now).as("created_at"),
        ]),
    )
    .onConflict((oc) => oc.columns(["ruc", "month"]).doUpdateSet(revive(now)))
    .executeTakeFirst();

  wake(db, affected.numInsertedOrUpdatedRows);
}

// A serial can move credit to a RUC other than the lead's own RUC.
export async function enqueueAttributionForSerials(
  db: DatabaseExecutor,
  serials: readonly string[],
  now: Date,
): Promise<void> {
  if (serials.length === 0) {
    return;
  }

  const affected = await db
    .insertInto("merchant_attribution_jobs")
    .columns(["ruc", "month", "claimable_at", "created_at"])
    .expression((eb) =>
      eb
        .selectFrom("merchant_sales as s")
        .innerJoin("merchant_sale_gpv as g", "g.sale_id", "s.id")
        .where("s.serial_number", "in", serials)
        .select((seb) => [
          "s.ruc",
          "g.realized_month as month",
          seb.val(now).as("claimable_at"),
          seb.val(now).as("created_at"),
        ])
        .distinct(),
    )
    .onConflict((oc) => oc.columns(["ruc", "month"]).doUpdateSet(revive(now)))
    .executeTakeFirst();

  wake(db, affected.numInsertedOrUpdatedRows);
}

// Revive the existing RUC-month so updates arriving during a lease are retried.
function revive(now: Date) {
  return {
    queue_state: "pending" as const,
    claimable_at: now,
    attempt_count: 0,
    lease_owner: null,
    error_message: null,
    completed_at: null,
  };
}

function wake(db: DatabaseExecutor, affected: bigint | undefined): void {
  if (!affected || affected === 0n) {
    return;
  }

  // Using the same executor defers the notification until its transaction commits.
  notify(db, JOB_TABLE_CHANNELS.merchant_attribution_jobs);
}
