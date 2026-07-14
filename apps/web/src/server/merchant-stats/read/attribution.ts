import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { MerchantAccountRow, RecordFilters } from "./contracts";
import { cohortFilter } from "./filters";

// The attribution work queue: one row per RUC with its enrichment state. This
// is the CRM's actual edge over the spreadsheet -- the team re-attaches seller,
// zone and target by hand every week because a downloaded sheet has no durable
// row identity. Here the enrichment is keyed to the RUC and survives reimport.
export async function getMerchantAccounts(
  db: DatabaseExecutor,
  filters: RecordFilters & { missingEnrichment?: boolean },
  page: { limit: number; offset: number },
): Promise<MerchantAccountRow[]> {
  const accounts = await db
    .selectFrom("merchant_accounts as a")
    .leftJoin("organizations as o", "o.id", "a.organization_id")
    .leftJoin("users as u", "u.id", "a.real_seller_user_id")
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .leftJoin("merchant_sales as s", "s.ruc", "a.ruc")
    .where((eb) => cohortFilter(eb, filters))
    .$if(!!filters.saleMonth, (qb) =>
      qb.where("s.sale_month", "=", filters.saleMonth!),
    )
    .$if(!!filters.product, (qb) =>
      qb.where("s.product", "=", filters.product!),
    )
    .$if(!!filters.missingEnrichment, (qb) =>
      qb.where((eb) =>
        eb.or([
          eb("a.real_seller_user_id", "is", null),
          eb("a.projected_gpv", "is", null),
          eb("a.branch_id", "is", null),
        ]),
      ),
    )
    .select((eb) => [
      "a.ruc",
      "a.organization_id",
      "o.legal_name as organization_name",
      "a.real_seller_user_id",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
      "a.branch_id",
      "b.name as branch_name",
      "a.projected_gpv",
      eb.fn.count<number>("s.id").distinct().as("sales_count"),
      eb.fn.max("s.sale_month").as("latest_sale_month"),
    ])
    .groupBy([
      "a.ruc",
      "a.organization_id",
      "o.legal_name",
      "a.real_seller_user_id",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
      "a.branch_id",
      "b.name",
      "a.projected_gpv",
    ])
    // Newest cohort first: the rows needing attribution are the ones just sold.
    .orderBy("latest_sale_month", "desc")
    .orderBy("a.ruc")
    .limit(page.limit)
    .offset(page.offset)
    .execute();

  return accounts.map((row) => ({
    ruc: row.ruc,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    realSellerUserId: row.real_seller_user_id,
    realSellerName: displayName(row) ?? row.real_seller_label,
    branchId: row.branch_id,
    branchName: row.branch_name,
    projectedGpv: numberOrNull(row.projected_gpv),
    salesCount: row.sales_count ?? 0,
    latestSaleMonth: row.latest_sale_month ?? null,
  }));
}

function displayName(row: {
  names: string | null;
  first_surname: string | null;
}): string | null {
  const full = [row.names, row.first_surname].filter(Boolean).join(" ").trim();
  return full.length > 0 ? full : null;
}

function numberOrNull(value: unknown): number | null {
  return value == null ? null : Number(value);
}
