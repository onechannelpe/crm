import type { LeadNotificationContext } from "~/server/workflow/lead/domain/history";
import { isPlainRecord } from "~/shared/type-guards";

function isPaymentUnitList(
  value: unknown,
): value is { label: string; paymentUrl: string | null }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (unit) =>
        isPlainRecord(unit) &&
        typeof unit["label"] === "string" &&
        (unit["paymentUrl"] === null || typeof unit["paymentUrl"] === "string"),
    )
  );
}

export function isLeadNotificationContext(
  value: unknown,
): value is LeadNotificationContext {
  if (
    !isPlainRecord(value) ||
    typeof value["ruc"] !== "string" ||
    typeof value["executiveId"] !== "string" ||
    typeof value["branchId"] !== "string"
  ) {
    return false;
  }

  return (
    value["paymentUnits"] === undefined ||
    isPaymentUnitList(value["paymentUnits"])
  );
}
