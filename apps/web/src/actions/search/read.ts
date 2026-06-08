"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import { getServerRuntime } from "~/server/runtime";
import { throwDomain } from "~/server/shared/domain-error";
import { isErr } from "~/server/shared/result";

export async function getMySearchAllowance() {
  const { repos } = getServerRuntime().search;
  const session = await requirePermission("capacity:read:self");
  const result = await getSearchCapacitySnapshot(session.userId, repos);
  if (isErr(result)) throwDomain(result.error);
  return result.value;
}
