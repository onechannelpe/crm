import type { LeadAssignmentCommand } from "~/server/lead-operations/contracts";
import type { LeadAssignmentError } from "~/server/lead-operations/errors";
import { createAssignment } from "~/server/leads/domain-assignment";
import { canContactNow } from "~/server/leads/domain-cooldown";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

export type { LeadAssignmentError } from "~/server/lead-operations/errors";

export function createLeadAssignmentService(repos: Repositories) {
  return {
    async assignCandidatesToExecutive(
      userId: number,
      candidates: LeadAssignmentCommand["candidates"],
    ): Promise<Result<number, LeadAssignmentError>> {
      try {
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
            organization = await repos.organizations.findOrCreate(
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
            contact = await repos.contacts.findOrCreate(
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
          await repos.leadAssignments.createMany(assignments);
        }

        return Ok(assignments.length);
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
