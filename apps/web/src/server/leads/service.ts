import { config } from "~/lib/config";
import { createAssignment } from "~/server/leads/domain-assignment";
import { canContactNow } from "~/server/leads/domain-cooldown";
import { canLockOrganization } from "~/server/leads/domain-org-lock";
import { createQuotaService } from "~/server/quota/service";
import { createAuditService } from "~/server/shared/audit";
import { engineClient } from "~/server/shared/engine";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, isErr, type Result } from "~/server/shared/result";

export function createLeadAssignmentService(repos: Repositories) {
  const quotaService = createQuotaService(repos);
  const audit = createAuditService(repos);

  return {
    async requestLeads(
      userId: number,
      branchId: number,
      bufferSize: number = config.leadAssignment.defaultBufferSize,
    ): Promise<Result<number, string>> {
      const currentCount =
        await repos.leadAssignments.countActiveByUser(userId);
      const needed = Math.max(0, bufferSize - currentCount);
      if (needed === 0) return Ok(0);
      const engineHealthy = await engineClient.health();
      if (!engineHealthy) {
        return Err(
          "Lead engine unavailable. Verify engine service and dataset.",
        );
      }

      const quotaResult = await quotaService.consume(userId, needed);
      if (isErr(quotaResult)) return quotaResult;

      const orgs = await repos.organizations.findUnlockedOrLockedToBranch(
        branchId,
        needed * 2,
      );
      const assignments = [];

      try {
        for (const org of orgs) {
          if (assignments.length >= needed) break;
          if (!canLockOrganization(org, branchId)) continue;

          // oxlint-disable-next-line no-await-in-loop -- preserve deterministic assignment order per organization.
          const searchResults = await engineClient.search("ruc", org.ruc);

          for (const result of searchResults.results) {
            if (assignments.length >= needed) break;
            if (!result.org_ruc) continue;

            // oxlint-disable-next-line no-await-in-loop -- each contact decision depends on previous assignment count checks.
            const contact = await repos.contacts.findOrCreate(
              org.id,
              result.dni,
              result.name,
              result.phone_primary,
            );

            if (!canContactNow(contact)) continue;

            if (!org.locked_branch_id) {
              // oxlint-disable-next-line no-await-in-loop -- first valid contact claims branch ownership atomically.
              await repos.organizations.lockToBranch(org.id, branchId, userId);
            }

            assignments.push(createAssignment(userId, contact.id));
          }
        }

        if (assignments.length > 0) {
          await repos.leadAssignments.createMany(assignments);
        }
      } catch (error) {
        const refundOnError = await quotaService.refund(userId, needed);
        if (isErr(refundOnError)) {
          throw new Error(
            `Lead assignment failed and quota refund failed: ${refundOnError.error}`,
            { cause: error },
          );
        }
        throw error;
      }

      const unusedQuota = needed - assignments.length;
      if (unusedQuota > 0) {
        const refundResult = await quotaService.refund(userId, unusedQuota);
        if (isErr(refundResult)) return refundResult;
      }

      await audit.log(userId, "leads_requested", "lead_assignment", userId, {
        requested: needed,
        assigned: assignments.length,
      });

      return Ok(assignments.length);
    },

    async completeLead(
      userId: number,
      assignmentId: number,
    ): Promise<Result<void, string>> {
      await repos.leadAssignments.markCompleted(assignmentId, userId);
      return Ok(undefined);
    },
  };
}
