import type { AppContext } from "~/server/platform/action/context";
import { type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import { toAvatarDomainError } from "~/server/users/avatar-error";

import type { MemberAvatarDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

export async function updateMemberAvatar(
  ctx: AppContext,
  deps: MemberAvatarDeps,
  command: { userId: UserId; file: File },
): Promise<Result<{ avatarVersion: number }, DomainError>> {
  const target = await authorizeMemberManagement(
    ctx,
    deps.users,
    command.userId,
  );
  if (isErr(target)) return target;

  const result = await deps.avatars.upload(command.userId, command.file);
  if (isErr(result)) return Err(toAvatarDomainError(result.error.code));

  return Ok({ avatarVersion: result.value.avatarVersion });
}
