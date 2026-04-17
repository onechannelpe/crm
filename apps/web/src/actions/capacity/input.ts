import { config } from "~/lib/config";
import {
  assertFinitePositive,
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import {
  isBranchId,
  isTeamId,
  isUserId,
  type BranchId,
  type TeamId,
  type UserId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

export function parseCapacityAmount(
  amount: number,
): Result<number, DomainError> {
  try {
    const safeAmount = assertPositiveInt(amount, "amount");
    if (safeAmount > config.capacityRequests.maxRequestAmount) {
      return Err(
        domainError(
          "validation",
          "capacity.amount.exceeds_max",
          "amount exceeds configured maximum",
        ),
      );
    }
    return Ok(safeAmount);
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "capacity.amount.invalid",
        error instanceof Error ? error.message : "Invalid amount",
      ),
    );
  }
}

export function parseCapacityDecisionInput(input: {
  requestId: number;
  note?: string;
}): Result<{ requestId: number; note: string | null }, DomainError> {
  try {
    return Ok({
      requestId: assertPositiveInt(input.requestId, "requestId"),
      note:
        input.note == null ? null : assertNonEmptyString(input.note, "note"),
    });
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "capacity.decision.invalid",
        error instanceof Error ? error.message : "Invalid capacity decision",
      ),
    );
  }
}

export function parseCapacityGrantInput(input: {
  userId: UserId;
  amount: number;
  reason: string;
}): Result<{ userId: UserId; amount: number; reason: string }, DomainError> {
  try {
    if (!isUserId(input.userId)) {
      return Err(
        domainError("validation", "capacity.user_id.invalid", "Invalid userId"),
      );
    }
    const amountResult = parseCapacityAmount(input.amount);
    if (!amountResult.ok) {
      return amountResult;
    }
    const reasonResult = parseCapacityReason(input.reason);
    if (!reasonResult.ok) {
      return reasonResult;
    }
    return Ok({
      userId: input.userId,
      amount: amountResult.value,
      reason: reasonResult.value,
    });
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "capacity.grant.invalid",
        error instanceof Error ? error.message : "Invalid capacity grant",
      ),
    );
  }
}

export function parseCapacityReason(
  reason: string,
): Result<string, DomainError> {
  try {
    return Ok(assertNonEmptyString(reason, "reason"));
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "capacity.reason.invalid",
        error instanceof Error ? error.message : "Invalid reason",
      ),
    );
  }
}

export function parseSearchPolicyLimit(
  monthlySearchLimit: number,
): Result<number, DomainError> {
  try {
    const safeLimit = assertFinitePositive(
      monthlySearchLimit,
      "monthlySearchLimit",
    );
    if (safeLimit > config.searchAccess.maxMonthlyLimit) {
      return Err(
        domainError(
          "validation",
          "capacity.policy.search_limit.exceeds_max",
          "monthlySearchLimit exceeds configured maximum",
        ),
      );
    }
    return Ok(safeLimit);
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "capacity.policy.search_limit.invalid",
        error instanceof Error ? error.message : "Invalid monthlySearchLimit",
      ),
    );
  }
}

export function parseSearchPolicyOverrideInput(input: {
  userId: UserId;
  monthlySearchLimit: number;
  expiresAt: number | null;
}): Result<
  { userId: UserId; monthlyLimit: number; expiresAt: number | null },
  DomainError
> {
  try {
    if (!isUserId(input.userId)) {
      return Err(
        domainError("validation", "capacity.user_id.invalid", "Invalid userId"),
      );
    }
    const limitResult = parseSearchPolicyLimit(input.monthlySearchLimit);
    if (!limitResult.ok) {
      return limitResult;
    }
    return Ok({
      userId: input.userId,
      monthlyLimit: limitResult.value,
      expiresAt: input.expiresAt,
    });
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "capacity.policy.search_override.invalid",
        error instanceof Error
          ? error.message
          : "Invalid search policy override",
      ),
    );
  }
}

export function parseLeadPolicyValues(input: {
  activeBufferTarget: number;
  dailyRefillLimit: number;
}): Result<
  { activeBufferTarget: number; dailyRefillLimit: number },
  DomainError
> {
  try {
    const safeBuffer = assertFinitePositive(
      input.activeBufferTarget,
      "activeBufferTarget",
    );
    if (safeBuffer > config.leadAssignment.maxBufferTarget) {
      return Err(
        domainError(
          "validation",
          "capacity.policy.active_buffer.exceeds_max",
          "activeBufferTarget exceeds configured maximum",
        ),
      );
    }
    const safeRefill = assertFinitePositive(
      input.dailyRefillLimit,
      "dailyRefillLimit",
    );
    if (safeRefill > config.capacityRequests.maxRequestAmount) {
      return Err(
        domainError(
          "validation",
          "capacity.policy.daily_refill.exceeds_max",
          "dailyRefillLimit exceeds configured maximum",
        ),
      );
    }
    return Ok({ activeBufferTarget: safeBuffer, dailyRefillLimit: safeRefill });
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "capacity.policy.lead_values.invalid",
        error instanceof Error ? error.message : "Invalid lead policy values",
      ),
    );
  }
}

export function parseLeadPolicyOverrideInput(input: {
  userId: UserId;
  activeBufferTarget: number;
  dailyRefillLimit: number;
  expiresAt: number | null;
}): Result<
  {
    userId: UserId;
    bufferTarget: number;
    dailyLimit: number;
    expiresAt: number | null;
  },
  DomainError
> {
  try {
    if (!isUserId(input.userId)) {
      return Err(
        domainError("validation", "capacity.user_id.invalid", "Invalid userId"),
      );
    }
    const valuesResult = parseLeadPolicyValues({
      activeBufferTarget: input.activeBufferTarget,
      dailyRefillLimit: input.dailyRefillLimit,
    });
    if (!valuesResult.ok) {
      return valuesResult;
    }
    return Ok({
      userId: input.userId,
      bufferTarget: valuesResult.value.activeBufferTarget,
      dailyLimit: valuesResult.value.dailyRefillLimit,
      expiresAt: input.expiresAt,
    });
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "capacity.policy.lead_override.invalid",
        error instanceof Error ? error.message : "Invalid lead policy override",
      ),
    );
  }
}

export function parseScopeDefaultInput(input: {
  scopeType: "branch" | "team";
  scopeId: BranchId | TeamId;
}): Result<
  | { scopeType: "branch"; scopeId: BranchId }
  | { scopeType: "team"; scopeId: TeamId },
  DomainError
> {
  try {
    if (input.scopeType === "branch" && !isBranchId(input.scopeId)) {
      return Err(
        domainError("validation", "capacity.policy.scope.invalid", "Invalid branch scopeId"),
      );
    }
    if (input.scopeType === "team" && !isTeamId(input.scopeId)) {
      return Err(
        domainError("validation", "capacity.policy.scope.invalid", "Invalid team scopeId"),
      );
    }
    if (input.scopeType === "branch") {
      return Ok({
        scopeType: "branch",
        scopeId: input.scopeId,
      });
    }
    if (input.scopeType === "team") {
      return Ok({
        scopeType: "team",
        scopeId: input.scopeId,
      });
    }
    input.scopeType satisfies never;
    return Err(
      domainError(
        "validation",
        "capacity.policy.scope.invalid",
        "Invalid scope type",
      ),
    );
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "capacity.policy.scope.invalid",
        error instanceof Error ? error.message : "Invalid scope default input",
      ),
    );
  }
}
