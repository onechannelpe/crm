import { computeClientCompletenessScore } from "~/server/sales/completeness";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import {
  getSalesRecordAudit,
  loadProducts,
  okCommandResult,
  persistDraftState,
  runSalesRecordMutation,
  salesRecordFailure,
  type SalesRecordMutationDeps,
  validateDraftPayload,
} from "./shared";
import type { CreateSalesRecordDraftInput } from "./types/draft-input";

export async function updateDraft(
  ctx: AppContext,
  deps: SalesRecordMutationDeps,
  input: {
    recordId: number;
    draft: Omit<CreateSalesRecordDraftInput, "source" | "leadAssignmentId">;
    correctionNotes: string | null;
  },
): Promise<Result<{ success: true }, DomainError>> {
  return runSalesRecordMutation(deps, async (repos) => {
    const audit = getSalesRecordAudit(repos);
    const record = await repos.salesRecords.findById(input.recordId);
    if (!record) {
      return salesRecordFailure("not_found", "Sales record not found");
    }
    if (record.executive_user_id !== ctx.actor.userId) {
      return salesRecordFailure("forbidden", "Not your sales record");
    }
    if (record.status !== "draft" && record.status !== "rejected") {
      return salesRecordFailure(
        "invalid_state",
        "Only draft or rejected records can be edited",
      );
    }

    const payloadValidation = validateDraftPayload({
      addresses: input.draft.addresses,
      products: input.draft.products,
    });
    if (!payloadValidation.ok) {
      return payloadValidation;
    }

    const draft = {
      ...input.draft,
      client: {
        ...input.draft.client,
        completenessScore: computeClientCompletenessScore(input.draft.client),
      },
    };
    const productsResult = await loadProducts(repos, draft.products);
    if (!productsResult.ok) {
      return productsResult;
    }

    const now = Date.now();
    await persistDraftState({
      repos,
      recordId: input.recordId,
      input: draft,
      products: productsResult.value,
      now,
    });
    await repos.salesRecords.touch(input.recordId, now);
    await audit.log(
      ctx.actor.userId,
      "sales_record_draft_updated",
      "sales_record",
      input.recordId,
      {
        status: record.status,
        correctionNotes: input.correctionNotes,
      },
    );
    return okCommandResult();
  });
}
