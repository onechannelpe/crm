import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { LeadRepository } from "../../application/ports/lead-repository";
import type {
  LeadWriteRepository,
  CheckedLeadWriteRepository,
} from "../../ports/lead-write-repository";

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
      const result = await executor
        .updateTable("pipeline_leads")
        .set({
          executive_id: input.patch.executiveId,
          stage: input.patch.stage,
          status: input.patch.status,
          prioridad: input.patch.prioridad,
          updated_by: input.actorUserId,
          updated_at: input.now,
        })
        .where("id", "=", input.leadId)
        .where("updated_at", "=", input.expectedUpdatedAt)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },
  };
}
