import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { MappedGpvRow } from "../intake/contracts";
import {
  matchBranch,
  matchSellerUser,
  resolveRowMatch,
  type MatchContext,
} from "./matching";

const ACCOUNTS_CHUNK = 1000;

// Raw dealer upload. Backfills match-derived defaults (real seller, branch)
// only where the column is null, so human enrichment is never overwritten.
export async function backfillAccounts(
  trx: DatabaseExecutor,
  rows: readonly MappedGpvRow[],
  ctx: MatchContext,
  now: Date,
): Promise<void> {
  const values = perRuc(rows).map((row) => {
    const match = resolveRowMatch(ctx, row);
    return {
      ruc: row.ruc,
      organization_id: match.organizationId,
      real_seller_user_id: match.executiveId,
      real_seller_label: null,
      branch_id: match.branchId,
      projected_gpv: null,
      created_at: now,
      updated_at: now,
    };
  });

  for (const chunk of chunks(values, ACCOUNTS_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    await trx
      .insertInto("merchant_accounts")
      .values(chunk)
      .onConflict((oc) =>
        oc.column("ruc").doUpdateSet((eb) => ({
          organization_id: eb.fn.coalesce(
            eb.ref("merchant_accounts.organization_id"),
            eb.ref("excluded.organization_id"),
          ),
          real_seller_user_id: eb.fn.coalesce(
            eb.ref("merchant_accounts.real_seller_user_id"),
            eb.ref("excluded.real_seller_user_id"),
          ),
          branch_id: eb.fn.coalesce(
            eb.ref("merchant_accounts.branch_id"),
            eb.ref("excluded.branch_id"),
          ),
          updated_at: now,
        })),
      )
      .execute();
  }
}

// Enriched "GPV AL" upload. File values win for seller / zone / projected;
// blank cells fall back to what is stored, so a partially filled file does
// not erase prior enrichment.
export async function applyAccountEnrichment(
  trx: DatabaseExecutor,
  rows: readonly MappedGpvRow[],
  ctx: MatchContext,
  now: Date,
): Promise<void> {
  const values = perRuc(rows).map((row) => {
    const match = resolveRowMatch(ctx, row);
    const sellerUserId = matchSellerUser(ctx, row.realSellerName);
    return {
      ruc: row.ruc,
      organization_id: match.organizationId,
      // Keep the free-text label only when the name does not resolve to a user.
      real_seller_user_id: sellerUserId ?? match.executiveId,
      real_seller_label: sellerUserId ? null : row.realSellerName,
      branch_id: matchBranch(ctx, row.zonal) ?? match.branchId,
      projected_gpv: row.projectedGpv,
      created_at: now,
      updated_at: now,
    };
  });

  for (const chunk of chunks(values, ACCOUNTS_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    await trx
      .insertInto("merchant_accounts")
      .values(chunk)
      .onConflict((oc) =>
        oc.column("ruc").doUpdateSet((eb) => ({
          organization_id: eb.fn.coalesce(
            eb.ref("excluded.organization_id"),
            eb.ref("merchant_accounts.organization_id"),
          ),
          real_seller_user_id: eb.fn.coalesce(
            eb.ref("excluded.real_seller_user_id"),
            eb.ref("merchant_accounts.real_seller_user_id"),
          ),
          real_seller_label: eb.fn.coalesce(
            eb.ref("excluded.real_seller_label"),
            eb.ref("merchant_accounts.real_seller_label"),
          ),
          branch_id: eb.fn.coalesce(
            eb.ref("excluded.branch_id"),
            eb.ref("merchant_accounts.branch_id"),
          ),
          projected_gpv: eb.fn.coalesce(
            eb.ref("excluded.projected_gpv"),
            eb.ref("merchant_accounts.projected_gpv"),
          ),
          updated_at: now,
        })),
      )
      .execute();
  }
}

// One row per RUC, preferring a row that carries enrichment so the
// representative is the informative one.
function perRuc(rows: readonly MappedGpvRow[]): MappedGpvRow[] {
  const byRuc = new Map<string, MappedGpvRow>();
  for (const row of rows) {
    const existing = byRuc.get(row.ruc);
    if (!existing || (!hasEnrichment(existing) && hasEnrichment(row))) {
      byRuc.set(row.ruc, row);
    }
  }
  return [...byRuc.values()];
}

function hasEnrichment(row: MappedGpvRow): boolean {
  return (
    row.realSellerName !== null ||
    row.zonal !== null ||
    row.projectedGpv !== null
  );
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}
