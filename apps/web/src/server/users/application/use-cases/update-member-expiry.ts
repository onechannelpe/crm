import { type DomainError } from "~/domain/errors";
import { appDayRange } from "~/domain/time/app-time";
import type { AppContext } from "~/server/platform/action/context";
import { isErr, Ok, type Result } from "~/shared/result";

import type { UpdateMemberExpiryCommand } from "../contracts";
import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

// Sets the automatic-deactivation date. The existing expiry cron deactivates
// the member when this date passes; clearing it (null) removes the schedule.
export async function updateMemberExpiry(
  ctx: AppContext,
  deps: MemberWriteDeps,
  command: UpdateMemberExpiryCommand,
): Promise<Result<void, DomainError>> {
  const target = await authorizeMemberManagement(
    ctx,
    deps.users,
    command.userId,
  );
  if (isErr(target)) return target;

  const expiresAt = command.expiresOn
    ? appDayRange(command.expiresOn).endExclusive
    : null;
  await deps.users.updateExpiry(command.userId, expiresAt);

  return Ok(undefined);
}
