import { config } from "~/lib/config";
import {
  assertFinitePositive,
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { domainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export function parseCapacityAmount(
  amount: number,
): Result<number, ReturnType<typeof domainError>> {
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

export function parseCapacityReason(
  reason: string,
): Result<string, ReturnType<typeof domainError>> {
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
): Result<number, ReturnType<typeof domainError>> {
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

export function parseLeadPolicyValues(input: {
  activeBufferTarget: number;
  dailyRefillLimit: number;
}): Result<
  { activeBufferTarget: number; dailyRefillLimit: number },
  ReturnType<typeof domainError>
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
