import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

export interface SetTargetInput {
  ruc: string;
  effectiveFrom: string;
  projectedGpv: number | null;
  setBy: UserId;
  now: Date;
}

// Targets are effective-dated. A later revision never changes an earlier month.
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
      oc.columns(["ruc", "effective_from"]).doUpdateSet({
        projected_gpv: input.projectedGpv,
        set_by: input.setBy,
        set_at: input.now,
      }),
    )
    .execute();
}
