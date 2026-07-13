import type { AppContext } from "~/server/platform/action/context";
import { type DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";

import type { MemberIdCommand } from "../contracts";
import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

// Deactivation revokes live sessions so access ends immediately; the row is
// kept so the member's history and assignments remain intact.
export async function deactivateMember(
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

  await deps.users.setActive(command.userId, false);
  await deps.sessions.revokeAllForUser(command.userId);

  return Ok(undefined);
}
