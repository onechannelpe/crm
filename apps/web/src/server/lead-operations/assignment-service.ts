import { createAssignment } from "~/server/leads/domain-assignment";
import { canContactNow } from "~/server/leads/domain-cooldown";
import { createAuditService } from "~/server/shared/audit";
import type { Repositories } from "~/server/shared/registry";
import { Ok, type Result } from "~/server/shared/result";

import type { LeadCandidate } from "../engine-gateway/types";

export type LeadAssignmentError = { reason: "unexpected"; message: string };

export function createLeadAssignmentService(repos: Repositories) {
  const audit = createAuditService(repos);

  return {
    async assignCandidatesToExecutive(
      userId: number,
      branchId: number,
      candidates: LeadCandidate[],
    ): Promise<Result<number, LeadAssignmentError>> {
      try {
        const assignments = [];

        for (const candidate of candidates) {
          const contact = await repos.contacts.findOrCreate(
            candidate.organizationId,
            candidate.dni,
            candidate.name,
            candidate.phonePrimary,
          );
          if (!canContactNow(contact)) continue;
          if (candidate.requiresBranchLock) {
            await repos.organizations.lockToBranch(
              candidate.organizationId,
              branchId,
              userId,
            );
          }
          assignments.push(createAssignment(userId, contact.id));
        }

        if (assignments.length > 0) {
          await repos.leadAssignments.createMany(assignments);
        }

        await audit.log(userId, "lead_refill_executed", "user", userId, {
          requested: candidates.length,
          assigned: assignments.length,
        });
        return Ok(assignments.length);
      } catch {
        return {
          ok: false,
          error: {
            reason: "unexpected",
            message: "Unexpected lead assignment failure",
          },
        };
      }
    },
  };
}
