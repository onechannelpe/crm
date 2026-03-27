import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { domainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export function parseUserSessionsInput(
  userId: number,
): Result<{ userId: number }, ReturnType<typeof domainError>> {
  try {
    return Ok({ userId: assertPositiveInt(userId, "userId") });
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "admin.sessions.user_id.invalid",
        error instanceof Error ? error.message : "Invalid userId",
      ),
    );
  }
}

export function parseRevokeUserSessionInput(input: {
  sessionId: string;
  targetUserId: number;
}): Result<
  { sessionId: string; targetUserId: number },
  ReturnType<typeof domainError>
> {
  try {
    return Ok({
      sessionId: assertNonEmptyString(input.sessionId, "sessionId"),
      targetUserId: assertPositiveInt(input.targetUserId, "targetUserId"),
    });
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "admin.sessions.revoke.invalid",
        error instanceof Error ? error.message : "Invalid session revoke input",
      ),
    );
  }
}

export function parseRevokeAllUserSessionsInput(
  targetUserId: number,
): Result<{ targetUserId: number }, ReturnType<typeof domainError>> {
  try {
    return Ok({
      targetUserId: assertPositiveInt(targetUserId, "targetUserId"),
    });
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "admin.sessions.revoke_all.invalid",
        error instanceof Error ? error.message : "Invalid targetUserId",
      ),
    );
  }
}
