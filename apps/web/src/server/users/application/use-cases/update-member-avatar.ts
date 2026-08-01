import { type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import type { AppContext } from "~/server/platform/action/context";
import { toAvatarDomainError } from "~/server/users/avatar-error";
import { Err, isErr, Ok, type Result } from "~/shared/result";

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

  const result = await deps.avatars.upload(
    command.userId,
    command.file,
    ctx.operationAt,
  );
  if (isErr(result)) return Err(toAvatarDomainError(result.error.code));

  return Ok({ avatarVersion: result.value.avatarVersion });
}
