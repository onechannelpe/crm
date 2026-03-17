"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";
import { getSearchCapacityForUser } from "~/server/search-workflow/read-search-capacity";

export async function getMySearchAllowance() {
  const session = await requirePermission("capacity:read:self");
  const result = await getSearchCapacityForUser(session.userId, repos);
  if (isErr(result)) throwDomainError(result.error);
  return result.value;
}
