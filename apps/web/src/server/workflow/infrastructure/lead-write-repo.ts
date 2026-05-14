import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type {
  CheckedLeadWriteRepository,
  LeadRepository,
  LeadWriteRepository,
} from "../application/ports/lead";
import { toLeadPatchRow } from "./lead-repo";

export function createLeadWriteRepository(
  leads: LeadRepository,
): LeadWriteRepository {
  return {
    async updateLead(input) {
      await leads.updateById(input.leadId, {
        ...input.patch,
        updatedBy: input.actorUserId,
        updatedAt: input.now,
      });
    },
  };
}

export function createCheckedLeadWriteRepository(
  executor: DatabaseExecutor,
): CheckedLeadWriteRepository {
  return {
    async updateLeadChecked(input) {
      const patchRow = toLeadPatchRow({
        ...input.patch,
        updatedBy: input.actorUserId,
        updatedAt: input.now,
      });

      const result = await executor
        .updateTable("workflow_leads")
        .set(patchRow)
        .where("id", "=", input.leadId)
        .where("updated_at", "=", input.expectedUpdatedAt)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },
  };
}
