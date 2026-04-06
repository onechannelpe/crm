import { config } from "~/lib/config";
import {
  assertFinitePositive,
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { domainError, type DomainError } from "~/server/shared/domain-error";
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
  userId: number;
  amount: number;
  reason: string;
}): Result<{ userId: number; amount: number; reason: string }, DomainError> {
  try {
    const userId = assertPositiveInt(input.userId, "userId");
    const amountResult = parseCapacityAmount(input.amount);
    if (!amountResult.ok) {
      return amountResult;
    }
    const reasonResult = parseCapacityReason(input.reason);
    if (!reasonResult.ok) {
      return reasonResult;
    }
    return Ok({
      userId,
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
  userId: number;
  monthlySearchLimit: number;
  expiresAt: number | null;
}): Result<
  { userId: number; monthlyLimit: number; expiresAt: number | null },
  DomainError
> {
  try {
    const userId = assertPositiveInt(input.userId, "userId");
    const limitResult = parseSearchPolicyLimit(input.monthlySearchLimit);
    if (!limitResult.ok) {
      return limitResult;
    }
    return Ok({
      userId,
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
  userId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
  expiresAt: number | null;
}): Result<
  {
    userId: number;
    bufferTarget: number;
    dailyLimit: number;
    expiresAt: number | null;
  },
  DomainError
> {
  try {
    const userId = assertPositiveInt(input.userId, "userId");
    const valuesResult = parseLeadPolicyValues({
      activeBufferTarget: input.activeBufferTarget,
      dailyRefillLimit: input.dailyRefillLimit,
    });
    if (!valuesResult.ok) {
      return valuesResult;
    }
    return Ok({
      userId,
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
  scopeId: number;
}): Result<{ scopeType: "branch" | "team"; scopeId: number }, DomainError> {
  try {
    return Ok({
      scopeType: input.scopeType,
      scopeId: assertPositiveInt(input.scopeId, "scopeId"),
    });
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
