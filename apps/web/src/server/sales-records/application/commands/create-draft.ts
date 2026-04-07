import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import type { AppContext } from "~/server/shared/action-runtime";
import { type DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { CreateSalesRecordDraftInput } from "../contracts";
import {
  getSalesRecordAudit,
  loadProducts,
  persistDraftState,
  runSalesRecordMutation,
  type SalesRecordRateLimitedMutationDeps,
  salesRecordFailure,
  validateDraftPayload,
} from "./shared";

export async function createDraft(
  ctx: AppContext,
  deps: SalesRecordRateLimitedMutationDeps,
  input: CreateSalesRecordDraftInput,
): Promise<Result<{ id: number }, DomainError>> {
  await checkActionRateLimit(
    "sales_records.create_draft",
    ctx.actor.userId,
    deps.rateLimitDeps,
    ctx.ipAddress,
  );
  return runSalesRecordMutation(deps, async (repos) => {
    const audit = getSalesRecordAudit(repos);
    const payloadValidation = validateDraftPayload({
      addresses: input.addresses,
      products: input.products,
    });
    if (!payloadValidation.ok) {
      return payloadValidation;
    }
    if (input.source === "lead_assignment" && input.leadAssignmentId === null) {
      return salesRecordFailure(
        "invalid_data",
        "leadAssignmentId is required for lead-assignment sales",
      );
    }
    if (input.source === "manual" && input.leadAssignmentId !== null) {
      return salesRecordFailure(
        "invalid_data",
        "leadAssignmentId must be null for manual sales",
      );
    }
    if (input.leadAssignmentId !== null) {
      const assignment = await repos.contactAssignments.findActiveByIdForUser(
        input.leadAssignmentId,
        ctx.actor.userId,
      );
      if (!assignment) {
        return salesRecordFailure(
          "forbidden",
          "Lead assignment is not active or does not belong to user",
        );
      }
    }

    const client = {
      ...input.client,
      completenessScore: computeClientCompletenessScore(input.client),
    };
    const productsResult = await loadProducts(repos, input.products);
    if (!productsResult.ok) {
      return productsResult;
    }

    const now = Date.now();
    const recordId = await repos.salesRecords.create({
      source: input.source,
      status: "draft",
      executive_user_id: ctx.actor.userId,
      lead_assignment_id: input.leadAssignmentId,
      branch_id: ctx.actor.branchId,
      submitted_at: null,
      confirmed_at: null,
      rejected_at: null,
      cancelled_at: null,
      created_at: now,
      updated_at: now,
    });
    await persistDraftState({
      repos,
      recordId,
      input: {
        client,
        addresses: input.addresses,
        products: input.products,
      },
      products: productsResult.value,
      now,
    });
    await audit.log(
      ctx.actor.userId,
      "sales_record_created",
      "sales_record",
      recordId,
      { source: input.source },
    );
    return Ok({ id: recordId });
  });
}
