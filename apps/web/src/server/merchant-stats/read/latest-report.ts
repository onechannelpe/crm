import type { DatabaseExecutor } from "~/server/shared/db-executor";

export async function getActiveGpvSnapshotCut(
  db: DatabaseExecutor,
): Promise<Date | null> {
  const snapshot = await db
    .selectFrom("gpv_snapshots")
    .where("state", "=", "active")
    .select("cut_at")
    .executeTakeFirst();

  return snapshot?.cut_at ?? null;
}
