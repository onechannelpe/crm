import { createAssignment } from "~/server/contact-assignments/domain/assignment";
import { canContactNow } from "~/server/contact-assignments/domain/cooldown";
import type { LeadCandidate } from "~/server/shared/engine/lead-contract";
import type { UserId } from "~/server/shared/ids";

export type OrganizationRecord = {
  id: number;
};

export type ContactRecord = {
  id: number;
  cooldown_until: number | null;
};

export interface AssignContactsTransactionRepos {
  organizations: {
    findOrCreate(ruc: string, name: string): Promise<OrganizationRecord>;
  };
  contacts: {
    findOrCreate(
      organizationId: number,
      dni: string,
      name: string,
      phone: string,
    ): Promise<ContactRecord>;
  };
  contactAssignments: {
    createMany(
      assignments: ReturnType<typeof createAssignment>[],
    ): Promise<void>;
  };
}

export type AssignContactsTransactionRunner = <T>(
  operation: (repos: AssignContactsTransactionRepos) => Promise<T>,
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

async function findOrCreateOrganizationsByRuc(
  candidates: LeadCandidate[],
  repos: Pick<AssignContactsTransactionRepos, "organizations">,
): Promise<Map<string, number>> {
  const orgEntries = await Promise.all(
    [...groupCandidatesByRuc(candidates).entries()].map(
      async ([ruc, candidate]) => {
        const organization = await repos.organizations.findOrCreate(
          ruc,
          candidate.organization_name,
        );
        return [ruc, organization.id] as const;
      },
    ),
  );

  return new Map(orgEntries);
}

function collectContactInputsByKey(
  candidates: LeadCandidate[],
  organizationIdsByRuc: Map<string, number>,
): Map<string, { organizationId: number; candidate: LeadCandidate }> {
  const contactInputByKey = new Map<
    string,
    { organizationId: number; candidate: LeadCandidate }
  >();
  for (const candidate of candidates) {
    const organizationId = organizationIdsByRuc.get(candidate.ruc);
    if (organizationId === undefined) {
      continue;
    }
    const key = resolveContactKey({ organizationId, candidate });
    if (!contactInputByKey.has(key)) {
      contactInputByKey.set(key, { organizationId, candidate });
    }
  }

  return contactInputByKey;
}

async function findOrCreateContactsByKey(
  contactInputByKey: Map<
    string,
    { organizationId: number; candidate: LeadCandidate }
  >,
  repos: Pick<AssignContactsTransactionRepos, "contacts">,
): Promise<Map<string, ContactRecord>> {
  const contactEntries = await Promise.all(
    [...contactInputByKey.entries()].map(
      async ([key, { organizationId, candidate }]) => {
        const contact = await repos.contacts.findOrCreate(
          organizationId,
          candidate.dni,
          candidate.person_name,
          candidate.phone_primary,
        );
        return [key, contact] as const;
      },
    ),
  );

  return new Map(contactEntries);
}

function buildAvailableAssignments(input: {
  actorUserId: UserId;
  candidates: LeadCandidate[];
  organizationIdsByRuc: Map<string, number>;
  contactsByKey: Map<string, ContactRecord>;
}) {
  const assignments = [];
  for (const candidate of input.candidates) {
    const organizationId = input.organizationIdsByRuc.get(candidate.ruc);
    if (organizationId === undefined) {
      continue;
    }
    const contact = input.contactsByKey.get(
      resolveContactKey({ organizationId, candidate }),
    );
    if (!contact || !canContactNow(contact)) {
      continue;
    }
    assignments.push(createAssignment(input.actorUserId, contact.id));
  }

  return assignments;
}

export async function createContactAssignmentsFromCandidates(input: {
  actorUserId: UserId;
  candidates: LeadCandidate[];
  runInTransaction: AssignContactsTransactionRunner;
}): Promise<number> {
  return input.runInTransaction(async (txRepos) => {
    const organizationIdsByRuc = await findOrCreateOrganizationsByRuc(
      input.candidates,
      txRepos,
    );
    const contactInputByKey = collectContactInputsByKey(
      input.candidates,
      organizationIdsByRuc,
    );
    const contactsByKey = await findOrCreateContactsByKey(
      contactInputByKey,
      txRepos,
    );
    const assignments = buildAvailableAssignments({
      actorUserId: input.actorUserId,
      candidates: input.candidates,
      organizationIdsByRuc,
      contactsByKey,
    });

    if (assignments.length > 0) {
      await txRepos.contactAssignments.createMany(assignments);
    }
    return assignments.length;
  });
}
