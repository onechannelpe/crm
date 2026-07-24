import type { RucMerchantStats } from "~/contracts/merchant-stats/views";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { dateFromStorage, monthFromStorageDate } from "../storage-month";
import { displayName } from "./names";

export async function getMerchantStatsByRuc(
  db: DatabaseExecutor,
  ruc: string,
): Promise<RucMerchantStats> {
  const [devices, monthly] = await Promise.all([
    db
      .selectFrom("merchant_sales")
      .select(["id", "product", "serial_number", "sold_at", "m0_plus_15d_gpv"])
      .where("ruc", "=", ruc)
      .orderBy("sold_at", "desc")
      .execute(),
    db
      .selectFrom("merchant_monthly_gpv")
      .select(["month", "gpv", "trx"])
      .where("ruc", "=", ruc)
      .orderBy("month")
      .execute(),
  ]);

  const latestMonth = monthly.at(-1)?.month ?? null;

  const [target, attribution] = await Promise.all([
    latestMonth === null
      ? undefined
      : // Read the target in force for the latest realized month.
        db
          .selectFrom("merchant_targets")
          .select("projected_gpv")
          .where("ruc", "=", ruc)
          .where("effective_from", "<=", latestMonth)
          .orderBy("effective_from", "desc")
          .limit(1)
          .executeTakeFirst(),
    latestMonth === null
      ? undefined
      : db
          .selectFrom("merchant_month_credit as a")
          .innerJoin("users as u", "u.id", "a.seller_user_id")
          .select(["u.names", "u.first_surname"])
          .where("a.ruc", "=", ruc)
          .where("a.month", "=", latestMonth)
          .executeTakeFirst(),
  ]);

  return {
    projectedGpv: target?.projected_gpv ?? null,
    devices: devices.map((row) => ({
      saleId: row.id,
      product: row.product,
      serialNumber: row.serial_number,
      soldAt: dateFromStorage(row.sold_at),
      m0Plus15dGpv: row.m0_plus_15d_gpv,
    })),
    monthlyGpv: monthly.map((row) => ({
      month: monthFromStorageDate(row.month),
      gpv: row.gpv,
      trx: row.trx,
    })),
    sellerName: attribution ? displayName(attribution) : null,
  };
}
