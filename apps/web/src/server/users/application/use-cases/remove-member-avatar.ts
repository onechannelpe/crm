import { type DomainError } from "~/domain/errors";
import type { AppContext } from "~/server/platform/action/context";
import { toAvatarDomainError } from "~/server/users/avatar-error";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import type { MemberIdCommand } from "../contracts";
import type { MemberAvatarDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

export async function removeMemberAvatar(
  ctx: AppContext,
  deps: MemberAvatarDeps,
  command: MemberIdCommand,
): Promise<Result<{ avatarVersion: number }, DomainError>> {
  const target = await authorizeMemberManagement(
    ctx,
    deps.users,
    command.userId,
  );
  if (isErr(target)) return target;

  const result = await deps.avatars.remove(command.userId);
  if (isErr(result)) return Err(toAvatarDomainError(result.error.code));

  return Ok({ avatarVersion: result.value.avatarVersion });
}
