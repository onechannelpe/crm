import { computeClientCompletenessScore } from "~/server/sales/completeness";
import type { AppContext } from "~/server/shared/action-runtime";
import { isErr } from "~/server/shared/result";

import type { SalesRecordsMutationService } from "../../infrastructure/mutations-context";
import { okCommandResult } from "./shared";
import type { CreateSalesRecordDraftInput } from "./types/draft-input";

export async function updateDraft(
  ctx: AppContext,
  salesRecordsService: SalesRecordsMutationService,
  input: {
    recordId: number;
    draft: Omit<CreateSalesRecordDraftInput, "source" | "leadAssignmentId">;
    correctionNotes: string | null;
  },
) {
  const result = await salesRecordsService.updateDraft(
    input.recordId,
    ctx.actor.userId,
    {
      ...input.draft,
      client: {
        ...input.draft.client,
        completenessScore: computeClientCompletenessScore(input.draft.client),
      },
    },
    input.correctionNotes,
  );
  if (isErr(result)) {
    return result;
  }
  return okCommandResult();
}
