import type { FilterOptions } from "~/contracts/merchant-stats/views";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { monthFromStorageDate } from "../storage-month";
import { displayName } from "./names";

export async function getLatestGpvMonth(
  db: DatabaseExecutor,
): Promise<FilterOptions["months"][number] | null> {
  const row = await db
    .selectFrom("merchant_monthly_gpv")
    .select("month")
    .orderBy("month", "desc")
    .limit(1)
    .executeTakeFirst();

  return row ? monthFromStorageDate(row.month) : null;
}

export async function getFilterOptions(
  db: DatabaseExecutor,
): Promise<FilterOptions> {
  const [branches, sellers, months, products] = await Promise.all([
    db
      .selectFrom("merchant_month_credit as a")
      .innerJoin("branches as b", "b.id", "a.branch_id")
      .select(["b.id", "b.name"])
      .distinct()
      .orderBy("b.name")
      .execute(),
    db
      .selectFrom("merchant_month_credit as a")
      .innerJoin("users as u", "u.id", "a.seller_user_id")
      .select(["u.id", "u.names", "u.first_surname"])
      .distinct()
      .execute(),
    db
      .selectFrom("merchant_monthly_gpv")
      .select("month")
      .distinct()
      .orderBy("month", "desc")
      .execute(),
    db
      .selectFrom("merchant_sales")
      .select("product")
      .distinct()
      .orderBy("product")
      .execute(),
  ]);

  return {
    branches: branches.map((row) => ({ id: row.id, name: row.name })),
    sellers: sellers
      .map((row) => ({ userId: row.id, name: displayName(row) ?? row.id }))
      .toSorted((a, b) => a.name.localeCompare(b.name)),
    months: months.map((row) => monthFromStorageDate(row.month)),
    products: products.map((row) => row.product),
  };
}
