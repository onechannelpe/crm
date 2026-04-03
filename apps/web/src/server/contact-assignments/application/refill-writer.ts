import { createAssignment } from "~/server/contact-assignments/domain/assignment";
import { canContactNow } from "~/server/contact-assignments/domain/cooldown";
import type { LeadCandidate } from "~/server/shared/engine/lead-contract";
import type { UserId } from "~/server/shared/ids";

export interface ContactAssignmentRefillTxRepos {
  organizations: {
    findOrCreate(ruc: string, name: string): Promise<{ id: number }>;
  };
  contacts: {
    findOrCreate(
      organizationId: number,
      dni: string,
      name: string,
      phone: string,
    ): Promise<{ id: number; cooldown_until: number | null }>;
  };
  contactAssignments: {
    createMany(
      assignments: ReturnType<typeof createAssignment>[],
    ): Promise<void>;
  };
}

export type ContactAssignmentRefillTransactionRunner = <T>(
  operation: (repos: ContactAssignmentRefillTxRepos) => Promise<T>,
) => Promise<T>;

function groupCandidatesByRuc(
  candidates: LeadCandidate[],
): Map<string, LeadCandidate> {
  const byRuc = new Map<string, LeadCandidate>();
  for (const candidate of candidates) {
    if (!byRuc.has(candidate.ruc)) {
      byRuc.set(candidate.ruc, candidate);
    }
  }
  return byRuc;
}

function resolveContactKey(input: {
  organizationId: number;
  candidate: LeadCandidate;
}): string {
  return `${input.organizationId}:${input.candidate.dni}:${input.candidate.phone_primary}`;
}

export async function createContactAssignmentsFromCandidates(input: {
  actorUserId: UserId;
  candidates: LeadCandidate[];
  runInTransaction: ContactAssignmentRefillTransactionRunner;
}): Promise<number> {
  return input.runInTransaction(async (txRepos) => {
    const orgEntries = await Promise.all(
      [...groupCandidatesByRuc(input.candidates).entries()].map(
        async ([ruc, candidate]) => {
          const organization = await txRepos.organizations.findOrCreate(
            ruc,
            candidate.organization_name,
          );
          return [ruc, organization.id] as const;
        },
      ),
    );
    const organizationIdsByRuc = new Map(orgEntries);

    const contactInputByKey = new Map<
      string,
      { organizationId: number; candidate: LeadCandidate }
    >();
    for (const candidate of input.candidates) {
      const organizationId = organizationIdsByRuc.get(candidate.ruc);
      if (organizationId === undefined) {
        continue;
      }
      const key = resolveContactKey({ organizationId, candidate });
      if (!contactInputByKey.has(key)) {
        contactInputByKey.set(key, { organizationId, candidate });
      }
    }

    const contactEntries = await Promise.all(
      [...contactInputByKey.entries()].map(
        async ([key, { organizationId, candidate }]) => {
          const contact = await txRepos.contacts.findOrCreate(
            organizationId,
            candidate.dni,
            candidate.person_name,
            candidate.phone_primary,
          );
          return [key, contact] as const;
        },
      ),
    );
    const contactsByKey = new Map(contactEntries);

    const assignments = [];
    for (const candidate of input.candidates) {
      const organizationId = organizationIdsByRuc.get(candidate.ruc);
      if (organizationId === undefined) {
        continue;
      }
      const contact = contactsByKey.get(
        resolveContactKey({ organizationId, candidate }),
      );
      if (!contact || !canContactNow(contact)) {
        continue;
      }
      assignments.push(createAssignment(input.actorUserId, contact.id));
    }

    if (assignments.length > 0) {
      await txRepos.contactAssignments.createMany(assignments);
    }
    return assignments.length;
  });
}
