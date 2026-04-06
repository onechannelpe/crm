import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import {
  assertTransition,
  getSalesRecordAudit,
  okCommandResult,
  runSalesRecordMutation,
  type SalesRecordRateLimitedMutationDeps,
  salesRecordFailure,
} from "./shared";

export async function submitRecord(
  ctx: AppContext,
  deps: SalesRecordRateLimitedMutationDeps,
  input: { recordId: number },
): Promise<Result<{ success: true }, DomainError>> {
  await checkActionRateLimit(
    "sales_records.submit",
    ctx.actor.userId,
    deps.rateLimitDeps,
  );
  return runSalesRecordMutation(deps, async (repos) => {
    const audit = getSalesRecordAudit(repos);
    const record = await repos.salesRecords.findById(input.recordId);
    if (!record) {
      return salesRecordFailure("not_found", "Sales record not found");
    }
    if (record.executive_user_id !== ctx.actor.userId) {
      return salesRecordFailure("forbidden", "Not your sales record");
    }
    const transition = assertTransition(
      record.status,
      "submitted_for_confirmation",
      "submit",
    );
    if (!transition.ok) {
      return transition;
    }

    const [client, addresses, products] = await Promise.all([
      repos.salesRecords.findClientByRecord(input.recordId),
      repos.salesRecords.findAddressesByRecord(input.recordId),
      repos.salesRecords.findProductsByRecord(input.recordId),
    ]);
    if (!client) {
      return salesRecordFailure(
        "invalid_state",
        "Client snapshot is required before submit",
      );
    }
    if (addresses.length < 1) {
      return salesRecordFailure(
        "invalid_data",
        "At least one address is required before submit",
      );
    }
    if (addresses.filter((it) => it.is_primary === 1).length !== 1) {
      return salesRecordFailure(
        "invalid_data",
        "Exactly one primary address is required before submit",
      );
    }
    if (products.length < 1) {
      return salesRecordFailure(
        "invalid_data",
        "At least one product is required before submit",
      );
    }

    const now = Date.now();
    await repos.salesRecords.updateStatus(
      input.recordId,
      "submitted_for_confirmation",
      { submitted_at: now },
    );
    await audit.log(
      ctx.actor.userId,
      "sales_record_submitted",
      "sales_record",
      input.recordId,
      { from: record.status, to: "submitted_for_confirmation" },
    );
    return okCommandResult();
  });
}
