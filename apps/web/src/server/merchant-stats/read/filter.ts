import type { Expression, ExpressionBuilder, SqlBool } from "kysely";

import type { BookFilter } from "~/contracts/merchant-stats/views";
import type { Database } from "~/lib/db/types";
import { BranchId, UserId } from "~/server/shared/ids";

// Credit is the only slice with a single home: seller and zone live on
// merchant_monthly_attribution and nowhere else, so every query that filters by
// them filters the same two columns on the same table.
//
// Month and product are deliberately NOT here. Month means a different column at
// each grain (realized_month on a gpv row, sale_month on a device) and product
// only exists at device grain. An owner that "owns" all four would force every
// caller to join a table it does not read just to give the helper an alias to
// reach through -- which is exactly what the previous version did to four
// queries.
type CreditExpressionBuilder = ExpressionBuilder<
  Database & { a: Database["merchant_monthly_attribution"] },
  "a"
>;

export type CreditFilter = Pick<BookFilter, "branchId" | "sellerUserId">;

// Kysely's documented recipe for conditional filters: accumulate expressions and
// combine with eb.and, which yields TRUE on an empty list. Callers pass the
// result straight to .where(...), so an unfiltered query needs no special case.
//
// Filter ids come from our own option list, so trust (a cast) rather than parse.
export function creditFilter(
  eb: CreditExpressionBuilder,
  filter: CreditFilter,
): Expression<SqlBool> {
  const conditions: Expression<SqlBool>[] = [];

  if (filter.branchId) {
    conditions.push(eb("a.branch_id", "=", BranchId.trust(filter.branchId)));
  }

  if (filter.sellerUserId) {
    conditions.push(
      eb("a.seller_user_id", "=", UserId.trust(filter.sellerUserId)),
    );
  }

  return eb.and(conditions);
}
