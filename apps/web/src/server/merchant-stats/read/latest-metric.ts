import type { DatabaseExecutor } from "~/server/shared/db-executor";

// The single source of "current truth": the value for each (sale, month) from
// the freshest snapshot that carries it. Ordered by cut_date then import time so
// a re-imported dirty-dated file never shadows the newest real snapshot. Every
// dashboard reads through this.
export function withLatestMetric(db: DatabaseExecutor) {
  return db.with("latest_metric", (qc) =>
    qc
      .selectFrom("merchant_sale_metrics as m")
      .innerJoin("merchant_sales_reports as r", "r.id", "m.report_id")
      .distinctOn(["m.merchant_sale_id", "m.month"])
      .select([
        "m.merchant_sale_id as sale_id",
        "m.month",
        "m.month_offset",
        "m.gpv",
        "m.trx",
      ])
      .orderBy("m.merchant_sale_id")
      .orderBy("m.month")
      .orderBy("r.cut_date", "desc")
      .orderBy("r.created_at", "desc"),
  );
}
