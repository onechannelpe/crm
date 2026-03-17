import type { LeadAssignmentCommand } from "~/server/lead-operations/contracts";
import type { LeadAssignmentError } from "~/server/lead-operations/errors";
import { createAssignment } from "~/server/leads/domain-assignment";
import { canContactNow } from "~/server/leads/domain-cooldown";
import type { UserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { RepositoryTransactionRunner } from "~/server/shared/transaction";

export type { LeadAssignmentError } from "~/server/lead-operations/errors";

interface LeadAssignmentServiceDeps {
  runInRepositoryTransaction: RepositoryTransactionRunner;
}

export function createLeadAssignmentService(deps: LeadAssignmentServiceDeps) {
  const { runInRepositoryTransaction } = deps;

  return {
    async assignCandidatesToExecutive(
      userId: UserId,
      candidates: LeadAssignmentCommand["candidates"],
    ): Promise<Result<number, LeadAssignmentError>> {
      try {
        const assignedCount = await runInRepositoryTransaction(
          async (transactionRepos) => {
            const assignments = [];
            const organizationsByRuc = new Map<
              string,
              Awaited<ReturnType<Repositories["organizations"]["findOrCreate"]>>
            >();
            const contactsByKey = new Map<
              string,
              Awaited<ReturnType<Repositories["contacts"]["findOrCreate"]>>
            >();

            for (const candidate of candidates) {
              let organization = organizationsByRuc.get(candidate.ruc);
              if (!organization) {
                organization =
                  await transactionRepos.organizations.findOrCreate(
                    candidate.ruc,
                    candidate.organization_name,
                  );
                organizationsByRuc.set(candidate.ruc, organization);
              }

              const contactKey = [
                organization.id,
                candidate.dni,
                candidate.phone_primary,
              ].join(":");

              let contact = contactsByKey.get(contactKey);
              if (!contact) {
                contact = await transactionRepos.contacts.findOrCreate(
                  organization.id,
                  candidate.dni,
                  candidate.person_name,
                  candidate.phone_primary,
                );
                contactsByKey.set(contactKey, contact);
              }

              if (!canContactNow(contact)) {
                continue;
              }

              assignments.push(createAssignment(userId, contact.id));
            }

            if (assignments.length > 0) {
              await transactionRepos.leadAssignments.createMany(assignments);
            }

            return assignments.length;
          },
        );

        return Ok(assignedCount);
      } catch (error) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Unexpected lead assignment failure",
        });
      }
    },
  };
}
