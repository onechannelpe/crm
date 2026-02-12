import type { Repositories } from "~/server/shared/registry";
import { createAuditService } from "~/server/shared/audit";
import { createQuotaService } from "~/server/quota/service";
import { searchEngine } from "~/server/shared/search";
import { createAssignment } from "~/server/leads/domain-assignment";
import { canContactNow } from "~/server/leads/domain-cooldown";
import { canLockOrganization } from "~/server/leads/domain-org-lock";
import { config } from "~/lib/config";
import { Ok, isErr, type Result } from "~/server/shared/result";

export function createLeadAssignmentService(repos: Repositories) {
    const quotaService = createQuotaService(repos);
    const audit = createAuditService(repos);

    return {
        async requestLeads(
            userId: number,
            branchId: number,
            bufferSize: number = config.leadAssignment.defaultBufferSize,
        ): Promise<Result<number, string>> {
            const currentCount = await repos.leadAssignments.countActiveByUser(userId);
            const needed = Math.max(0, bufferSize - currentCount);
            if (needed === 0) return Ok(0);

            const quotaResult = await quotaService.consume(userId, needed);
            if (isErr(quotaResult)) return quotaResult;

            const orgs = await repos.organizations.findUnlockedOrLockedToBranch(branchId, needed * 2);
            const assignments = [];

            for (const org of orgs) {
                if (assignments.length >= needed) break;
                if (!canLockOrganization(org, branchId)) continue;

                const searchResults = await searchEngine("ruc", org.ruc);

                for (const result of searchResults.results) {
                    if (assignments.length >= needed) break;
                    if (!result.org_ruc) continue;

                    const contact = await repos.contacts.findOrCreate(
                        org.id, result.dni, result.name, result.phone_primary,
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

            await audit.log(userId, "leads_requested", "lead_assignment", userId, {
                requested: needed, assigned: assignments.length,
            });

            return Ok(assignments.length);
        },

        async completeLead(userId: number, assignmentId: number): Promise<Result<void, string>> {
            await repos.leadAssignments.markCompleted(assignmentId);
            return Ok(undefined);
        },
    };
}
