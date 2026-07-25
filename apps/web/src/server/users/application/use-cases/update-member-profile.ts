import { type DomainError } from "~/domain/errors";
import type { AppContext } from "~/server/platform/action/context";
import { isErr, Ok, type Result } from "~/shared/result";

import type { UpdateMemberProfileCommand } from "../contracts";
import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

// Executive category only applies to executives; any prior value is cleared
// when the target is not (or is no longer) an executive.
export async function updateMemberProfile(
  ctx: AppContext,
  deps: MemberWriteDeps,
  command: UpdateMemberProfileCommand,
): Promise<Result<void, DomainError>> {
  const target = await authorizeMemberManagement(
    ctx,
    deps.users,
    command.userId,
  );
  if (isErr(target)) return target;

  await deps.users.updateProfile(command.userId, {
    names: command.names,
    first_surname: command.firstSurname,
    second_surname: command.secondSurname,
    team_id: command.teamId,
    executive_category:
      target.value.role === "executive" ? command.executiveCategory : null,
  });

  return Ok(undefined);
}
