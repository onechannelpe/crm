import { validationError } from "~/lib/app-errors";
import { config } from "~/lib/config";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";

export function validateCapacityAmount(amount: number): number {
  const safeAmount = assertPositiveInt(amount, "amount");
  if (safeAmount > config.capacityRequests.maxRequestAmount) {
    throw validationError("amount exceeds configured maximum");
  }
  return safeAmount;
}

export function validateCapacityReason(reason: string): string {
  return assertNonEmptyString(reason, "reason");
}
