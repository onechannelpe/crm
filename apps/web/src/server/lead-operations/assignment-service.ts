import { createAssignment } from "~/server/leads/domain-assignment";
import { canContactNow } from "~/server/leads/domain-cooldown";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadCandidate } from "../engine-gateway/types";

export type LeadAssignmentError = { reason: "unexpected"; message: string };

export function createLeadAssignmentService(repos: Repositories) {
  return {
    async assignCandidatesToExecutive(
      userId: number,
      candidates: LeadCandidate[],
    ): Promise<Result<number, LeadAssignmentError>> {
      try {
        const assignments = [];

        for (const candidate of candidates) {
          const organization = await repos.organizations.findOrCreate(
            candidate.ruc,
            candidate.organization_name,
          );
          const contact = await repos.contacts.findOrCreate(
            organization.id,
            candidate.dni,
            candidate.person_name,
            candidate.phone_primary,
          );
          if (!canContactNow(contact)) continue;
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
