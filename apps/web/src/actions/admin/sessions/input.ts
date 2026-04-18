import { assertNonEmptyString } from "~/lib/contracts/guards";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { asUserId, isUserId, type UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

export function parseUserSessionsInput(
  userId: string,
): Result<{ userId: UserId }, DomainError> {
  try {
    if (!isUserId(userId)) {
      throw new Error("Invalid userId");
    }
    return Ok({ userId: asUserId(userId) });
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
  targetUserId: string;
}): Result<{ sessionId: string; targetUserId: UserId }, DomainError> {
  try {
    if (!isUserId(input.targetUserId)) {
      throw new Error("Invalid targetUserId");
    }
    return Ok({
      sessionId: assertNonEmptyString(input.sessionId, "sessionId"),
      targetUserId: asUserId(input.targetUserId),
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
  targetUserId: string,
): Result<{ targetUserId: UserId }, DomainError> {
  try {
    if (!isUserId(targetUserId)) {
      throw new Error("Invalid targetUserId");
    }
    return Ok({
      targetUserId: asUserId(targetUserId),
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
