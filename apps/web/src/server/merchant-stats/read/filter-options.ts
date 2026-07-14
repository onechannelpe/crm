import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { sellerKeyOf, type MerchantStatsFilterOptions } from "./contracts";

// Options for the record surfaces. The analytics surface groups, so it
// needs none of this.
export async function getFilterOptions(
  db: DatabaseExecutor,
): Promise<MerchantStatsFilterOptions> {
  const branches = await db
    .selectFrom("merchant_accounts as a")
    .innerJoin("branches as b", "b.id", "a.branch_id")
    .select(["b.id", "b.name"])
    .distinct()
    .orderBy("b.name")
    .execute();

  // Left join, not inner: a real seller is only sometimes a CRM user. An
  // inner join to users would drop label-only sellers like "EMPRESA".
  const sellers = await db
    .selectFrom("merchant_accounts as a")
    .leftJoin("users as u", "u.id", "a.real_seller_user_id")
    .select([
      "a.real_seller_user_id",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
    ])
    .distinct()
    .execute();

  const saleMonths = await db
    .selectFrom("merchant_sales")
    .select("sale_month")
    .distinct()
    .orderBy("sale_month", "desc")
    .execute();

  const products = await db
    .selectFrom("merchant_sales")
    .select("product")
    .distinct()
    .orderBy("product")
    .execute();

  const byKey = new Map<string, string>();
  for (const row of sellers) {
    if (row.real_seller_user_id === null && row.real_seller_label === null) {
      continue;
    }
    const key = sellerKeyOf(row.real_seller_user_id, row.real_seller_label);
    byKey.set(key, displayName(row) ?? row.real_seller_label ?? key);
  }

  return {
    branches: branches.map((row) => ({ id: row.id, name: row.name })),
    sellers: [...byKey.entries()]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    saleMonths: saleMonths.map((row) => row.sale_month),
    products: products.map((row) => row.product),
  };
}

function displayName(row: {
  names: string | null;
  first_surname: string | null;
}): string | null {
  const full = [row.names, row.first_surname].filter(Boolean).join(" ").trim();
  return full.length > 0 ? full : null;
}
