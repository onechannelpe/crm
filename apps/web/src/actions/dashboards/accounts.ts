"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, throwDomain } from "~/server/shared/domain-error";
import type { DomainError } from "~/server/shared/domain-error";
import { BranchId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

// One field of the attach grid at a time; the inline editor commits a single
// column. Sending the exact field avoids re-writing untouched enrichment.
type AccountPatch =
  | { ruc: string; field: "realSellerUserId"; value: string | null }
  | { ruc: string; field: "branchId"; value: string | null }
  | { ruc: string; field: "projectedGpv"; value: number | null };

function parsePatch(raw: unknown): Result<AccountPatch, DomainError> {
  if (typeof raw !== "object" || raw === null)
    return Err(fail("invalid_input"));
  const input = raw as Record<string, unknown>;
  const ruc = input.ruc;
  if (typeof ruc !== "string" || ruc.length === 0) {
    return Err(fail("invalid_input"));
  }

  if (input.field === "realSellerUserId") {
    const value = input.value;
    if (value !== null && typeof value !== "string") {
      return Err(fail("invalid_input"));
    }
    return Ok({ ruc, field: "realSellerUserId", value });
  }
  if (input.field === "branchId") {
    const value = input.value;
    if (value !== null && typeof value !== "string") {
      return Err(fail("invalid_input"));
    }
    return Ok({ ruc, field: "branchId", value });
  }
  if (input.field === "projectedGpv") {
    const value = input.value;
    if (value !== null && typeof value !== "number") {
      return Err(fail("invalid_input"));
    }
    return Ok({ ruc, field: "projectedGpv", value });
  }
  return Err(fail("invalid_input"));
}

export async function updateMerchantAccount(
  raw: unknown,
): Promise<{ ok: true }> {
  return runAction({
    name: "dashboards.account.update",
    access: { kind: "permission", permission: "dashboards:manage" },
    parse: () => parsePatch(raw),
    audit: (patch) => ({ ruc: patch.ruc, field: patch.field }),

    execute: async (ctx, patch) => {
      const db = getServerRuntime().infra.db;
      const set = buildSet(patch, ctx.now());

      const result = await db
        .updateTable("merchant_accounts")
        .set(set)
        .where("ruc", "=", patch.ruc)
        .executeTakeFirst();

      if (Number(result.numUpdatedRows) === 0) {
        throwDomain(fail("merchant_account_not_found"));
      }
      return Ok({ ok: true as const });
    },
  });
}

function buildSet(patch: AccountPatch, now: Date) {
  if (patch.field === "realSellerUserId") {
    return {
      real_seller_user_id: patch.value ? UserId.trust(patch.value) : null,
      // A resolved CRM user supersedes any free-text label.
      real_seller_label: null,
      updated_at: now,
    };
  }
  if (patch.field === "branchId") {
    return {
      branch_id: patch.value ? BranchId.trust(patch.value) : null,
      updated_at: now,
    };
  }
  return { projected_gpv: patch.value, updated_at: now };
}
