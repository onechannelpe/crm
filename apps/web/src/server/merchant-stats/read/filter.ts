import type { Expression, ExpressionBuilder, SqlBool } from "kysely";

import type { BookFilter } from "~/contracts/merchant-stats/views";
import type { Database } from "~/lib/db/types";
import { BranchId, UserId } from "~/server/shared/ids";

type CreditExpressionBuilder = ExpressionBuilder<
  Database & { a: Database["merchant_month_credit"] },
  "a"
>;

export type CreditFilter = Pick<BookFilter, "branchId" | "sellerUserId">;

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
