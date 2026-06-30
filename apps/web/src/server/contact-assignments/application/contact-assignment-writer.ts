import { createAssignment } from "~/server/contact-assignments/domain/assignment";
import { canContactNow } from "~/server/contact-assignments/domain/cooldown";
import type { ContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import type { ContactsRepo } from "~/server/contacts/repos-contacts";
import type { OrganizationsRepo } from "~/server/contacts/repos-organizations";
import type { AppUow } from "~/server/shared/application/uow";
import type { DomainError } from "~/server/shared/domain-error";
import type { RecordCandidate } from "~/server/shared/engine/record-contract";
import type {
  OrganizationId,
  OrganizationPersonId,
  UserId,
} from "~/server/shared/ids";
import { Ok, type Result } from "~/server/shared/result";

export type OrganizationRecord = {
  id: OrganizationId;
};

export type ContactRecord = {
  id: OrganizationPersonId;
  cooldown_until: Date | null;
};

export type AssignContactsTransactionRepos = {
  organizations: Pick<OrganizationsRepo, "findOrCreate">;
  contacts: Pick<ContactsRepo, "findOrCreate">;
  contactAssignments: Pick<ContactAssignmentsRepo, "createMany">;
};

export type AssignContactsUow = AppUow<AssignContactsTransactionRepos>;

function groupCandidatesByRuc(
  candidates: RecordCandidate[],
): Map<string, RecordCandidate> {
  const byRuc = new Map<string, RecordCandidate>();
  for (const candidate of candidates) {
    if (!byRuc.has(candidate.ruc)) {
      byRuc.set(candidate.ruc, candidate);
    }
  }
  return byRuc;
}

function resolveContactKey(input: {
  organizationId: OrganizationId;
  candidate: RecordCandidate;
}): string {
  return `${input.organizationId}:${input.candidate.dni}:${input.candidate.phone_primary}`;
}

async function findOrCreateOrganizationsByRuc(
  candidates: RecordCandidate[],
  repos: Pick<AssignContactsTransactionRepos, "organizations">,
): Promise<Map<string, OrganizationId>> {
  const orgEntries = await Promise.all(
    [...groupCandidatesByRuc(candidates).entries()].map(
      async ([ruc, candidate]) => {
        const organization = await repos.organizations.findOrCreate(
          ruc,
          candidate.organization_name,
        );
        const entry: [string, OrganizationId] = [ruc, organization.id];
        return entry;
      },
    ),
  );

  return new Map(orgEntries);
}

function collectContactInputsByKey(
  candidates: RecordCandidate[],
  organizationIdsByRuc: Map<string, OrganizationId>,
): Map<string, { organizationId: OrganizationId; candidate: RecordCandidate }> {
  const contactInputByKey = new Map<
    string,
    { organizationId: OrganizationId; candidate: RecordCandidate }
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
    { organizationId: OrganizationId; candidate: RecordCandidate }
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
        const entry: [string, ContactRecord] = [key, contact];
        return entry;
      },
    ),
  );

  return new Map(contactEntries);
}

function buildAvailableAssignments(input: {
  actorUserId: UserId;
  contactsByKey: Map<string, ContactRecord>;
}) {
  const assignments = [];
  for (const contact of input.contactsByKey.values()) {
    if (!canContactNow(contact)) {
      continue;
    }
    assignments.push(createAssignment(input.actorUserId, contact.id));
  }

  return assignments;
}

export async function createContactAssignmentsFromCandidates(input: {
  actorUserId: UserId;
  candidates: RecordCandidate[];
  uow: AssignContactsUow;
}): Promise<Result<number, DomainError>> {
  return input.uow.run(async (txRepos) => {
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
      contactsByKey,
    });

    if (assignments.length > 0) {
      await txRepos.contactAssignments.createMany(assignments);
    }
    return Ok(assignments.length);
  });
}
