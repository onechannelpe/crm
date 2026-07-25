import type { MembersRoster } from "~/contracts/members";
import type { DomainError } from "~/domain/errors";
import type { AppContext } from "~/server/platform/action/context";
import { Ok, type Result } from "~/shared/result";

import { toMemberListItem } from "../member-view";
import type { MemberReadDeps } from "../ports";

export async function listBranchMembers(
  ctx: AppContext,
  deps: MemberReadDeps,
): Promise<Result<MembersRoster, DomainError>> {
  const rows = await deps.users.listByBranchWithTeam(ctx.actor.branchId);
  return Ok({ members: rows.map(toMemberListItem) });
}
