import type { DatabaseExecutor } from "~/server/shared/db-executor";

export async function getLatestCompletedMerchantReportCut(
  db: DatabaseExecutor,
): Promise<Date | null> {
  const report = await db
    .selectFrom("merchant_reports as r")
    .innerJoin("merchant_report_imports as i", "i.report_id", "r.id")
    .where("i.queue_state", "=", "done")
    .select("r.cut_at")
    .orderBy("r.cut_at", "desc")
    .executeTakeFirst();

  return report?.cut_at ?? null;
}
