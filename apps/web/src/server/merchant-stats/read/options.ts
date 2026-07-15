import type { FilterOptions } from "~/contracts/merchant-stats/views";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { displayName } from "./names";

// Options for the filter bar. Every list is drawn from the table the filter
// actually applies to, so an option can never select an empty result.
export async function getFilterOptions(
  db: DatabaseExecutor,
): Promise<FilterOptions> {
  const [branches, sellers, months, products] = await Promise.all([
    db
      .selectFrom("merchant_monthly_attribution as a")
      .innerJoin("branches as b", "b.id", "a.branch_id")
      .select(["b.id", "b.name"])
      .distinct()
      .orderBy("b.name")
      .execute(),
    // Inner join: a seller is a CRM user or the row is unassigned, and
    // "unassigned" is not something you filter to -- it is the bucket you look
    // at on the board, or a queue on Calidad de datos.
    db
      .selectFrom("merchant_monthly_attribution as a")
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
    months: months.map((row) => row.month),
    products: products.map((row) => row.product),
  };
}
