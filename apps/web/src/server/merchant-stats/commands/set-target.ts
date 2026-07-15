import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

export interface SetTargetInput {
  ruc: string;
  // First of the month the new number takes effect. Earlier months keep reading
  // whatever row was in force for them, which is the whole reason the projection
  // is effective-dated instead of stored per month.
  effectiveFrom: string;
  // Null records "no projection from here on" without erasing the rows earlier
  // months are measured against.
  projectedGpv: number | null;
  setBy: UserId;
  now: Date;
}

// The business sets one number per merchant: "este RUC debería rondar los 60k".
// Setting it again writes a new version rather than editing the old one, so a
// raise in July cannot make May retroactively a miss.
export async function setTarget(
  db: DatabaseExecutor,
  input: SetTargetInput,
): Promise<void> {
  await db
    .insertInto("merchant_targets")
    .values({
      ruc: input.ruc,
      effective_from: input.effectiveFrom,
      projected_gpv: input.projectedGpv,
      set_by: input.setBy,
      set_at: input.now,
    })
    .onConflict((oc) =>
      // Correcting a version that already exists for this month, rather than
      // creating a new one.
      oc.columns(["ruc", "effective_from"]).doUpdateSet({
        projected_gpv: input.projectedGpv,
        set_by: input.setBy,
        set_at: input.now,
      }),
    )
    .execute();
}
