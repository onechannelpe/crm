import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { BranchId, UserId } from "~/server/shared/ids";

export interface ResolveAttributionInput {
  ruc: string;
  month: string;
  sellerUserId: UserId | null;
  branchId: BranchId | null;
  resolvedBy: UserId;
  now: Date;
}

// The sales manager's verdict on a RUC-month the ladder could not settle.
// Terminal: method 'manual' is never revisited by an import.
//
// Returns the number of rows changed so the caller can tell "resolved" from
// "that RUC-month does not exist".
export async function resolveAttribution(
  db: DatabaseExecutor,
  input: ResolveAttributionInput,
): Promise<number> {
  const result = await db
    .updateTable("merchant_monthly_attribution")
    .set({
      seller_user_id: input.sellerUserId,
      branch_id: input.branchId,
      method: "manual",
      confidence: input.sellerUserId ? "exact" : "none",
      resolved_by: input.resolvedBy,
      resolved_at: input.now,
    })
    .where("ruc", "=", input.ruc)
    .where("month", "=", input.month)
    .executeTakeFirst();

  return Number(result.numUpdatedRows);
}
