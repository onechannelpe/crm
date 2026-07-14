import type { Expression, ExpressionBuilder, SqlBool } from "kysely";

import type { Database } from "~/lib/db/types";
import { BranchId, UserId } from "~/server/shared/ids";

import { parseSellerKey, type CohortFilters } from "./contracts";

// The one owner of filter application. Every merchant-stats query routes
// through here, so "does the seller filter work?" has a single answer instead
// of one per query. It previously had five, three of which disagreed.
//
// Both dimensions live on merchant_accounts, which every caller joins as "a".
// The alias is pinned in the type rather than passed in: a second alias would
// mean a second meaning for the same filter, which is what this module exists
// to prevent.
type AccountsExpressionBuilder = ExpressionBuilder<
  Database & { a: Database["merchant_accounts"] },
  "a"
>;

// Kysely's documented recipe for conditional filters: accumulate expressions
// and combine with eb.and, which yields TRUE on an empty list. Callers pass the
// result straight to .where(...), so an unfiltered query needs no special case.
//
// Filter ids cross the wire as plain strings; they come from our own filter
// option list, so trust (a cast) rather than parse.
export function cohortFilter(
  eb: AccountsExpressionBuilder,
  filters: CohortFilters,
): Expression<SqlBool> {
  const conditions: Expression<SqlBool>[] = [];

  if (filters.branchId) {
    conditions.push(eb("a.branch_id", "=", BranchId.trust(filters.branchId)));
  }

  if (filters.sellerKey) {
    const seller = parseSellerKey(filters.sellerKey);
    conditions.push(
      seller.kind === "user"
        ? eb("a.real_seller_user_id", "=", UserId.trust(seller.userId))
        : eb("a.real_seller_label", "=", seller.label),
    );
  }

  return eb.and(conditions);
}
