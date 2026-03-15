import { createAssignment } from "~/server/leads/domain-assignment";
import { canContactNow } from "~/server/leads/domain-cooldown";
import { canLockOrganization } from "~/server/leads/domain-org-lock";
import { createAuditService } from "~/server/shared/audit";
import { engineClient } from "~/server/shared/engine";
import type { EngineClient } from "~/server/shared/engine/client";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

export type LeadAssignmentError =
  | { reason: "engine_unavailable"; message: string }
  | { reason: "unexpected"; message: string };

export function createLeadAssignmentService(
  repos: Repositories,
  engine: EngineClient = engineClient,
) {
  const audit = createAuditService(repos);

  return {
    async assignLeadsForExecutive(
      userId: number,
      branchId: number,
      amount: number,
    ): Promise<Result<number, LeadAssignmentError>> {
      try {
        const engineHealthy = await engine.health();
        if (!engineHealthy) {
          return Err({
            reason: "engine_unavailable",
            message:
              "Lead engine unavailable. Verify engine service and dataset.",
          });
        }

        const orgs = await repos.organizations.findUnlockedOrLockedToBranch(
          branchId,
          amount * 2,
        );
        const assignments = [];

        for (const org of orgs) {
          if (assignments.length >= amount) break;
          if (!canLockOrganization(org, branchId)) continue;

          const searchResults = await engine.search("ruc", org.ruc);
          for (const result of searchResults.results) {
            if (assignments.length >= amount) break;
            const contact = await repos.contacts.findOrCreate(
              org.id,
              result.person.dni,
              result.person.name ?? result.person.dni,
              result.phones.primary,
            );
            if (!canContactNow(contact)) continue;
            if (!org.locked_branch_id) {
              await repos.organizations.lockToBranch(org.id, branchId, userId);
            }
            assignments.push(createAssignment(userId, contact.id));
          }
        }

        if (assignments.length > 0) {
          await repos.leadAssignments.createMany(assignments);
        }
        await audit.log(userId, "lead_refill_executed", "user", userId, {
          requested: amount,
          assigned: assignments.length,
        });
        return Ok(assignments.length);
      } catch {
        return Err({
          reason: "unexpected",
          message: "Unexpected lead refill failure",
        });
      }
    },
  };
}
