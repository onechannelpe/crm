"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import { getSearchCapacitySnapshot } from "~/server/capacity/application/get-search-capacity-snapshot";
import { getServerRuntime } from "~/server/runtime";
import { isErr } from "~/server/shared/result";

export async function getMySearchAllowance() {
  const { repos } = getServerRuntime().search;
  const session = await requirePermission("capacity:read:self");
  const result = await getSearchCapacitySnapshot(session.userId, repos);
  if (isErr(result)) throwDomainError(result.error);
  return result.value;
}
