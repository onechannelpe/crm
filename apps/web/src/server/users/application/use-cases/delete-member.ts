import { canDeleteMember } from "~/lib/auth/access/member-management";
import type { AppContext } from "~/server/platform/action/context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type { MemberIdCommand } from "../contracts";
import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

// Deleting a member is only permitted once their book of business is empty, so
// active leads are never silently orphaned. Callers reassign the leads first
// (lead:reassign) and then retry the deletion.
export async function deleteMember(
  ctx: AppContext,
  deps: MemberWriteDeps,
  command: MemberIdCommand,
): Promise<Result<void, DomainError>> {
  const target = await authorizeMemberManagement(
    ctx,
    deps.users,
    command.userId,
  );
  if (isErr(target)) return target;

  if (!canDeleteMember(ctx.actor.role, target.value.role)) {
    return Err(fail("cannot_manage_member"));
  }

  const activeLeads = await deps.workload.countActiveLeads(command.userId);
  if (activeLeads > 0) {
    return Err(fail("member_has_active_leads"));
  }

  await deps.sessions.revokeAllForUser(command.userId);
  await deps.users.deleteById(command.userId);

  return Ok(undefined);
}
