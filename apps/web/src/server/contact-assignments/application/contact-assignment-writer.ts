import { createAssignment } from "~/server/contact-assignments/domain/assignment";
import { canContactNow } from "~/server/contact-assignments/domain/cooldown";
import type { ContactAssignmentsRepo } from "~/server/contact-assignments/infrastructure/assignment-repo";
import type { ContactCadenceRepo } from "~/server/contact-assignments/infrastructure/cadence-repo";
import type { OrganizationRepository } from "~/server/organization/organization-repo";
import type { AppUow } from "~/server/shared/application/uow";
import type { DomainError } from "~/server/shared/domain-error";
import type { RecordCandidate } from "~/server/shared/engine/record-contract";
import type { OrganizationId, OrganizationPersonId, UserId } from "~/server/shared/ids";
import { Ok, type Result } from "~/server/shared/result";

export type AssignContactsTransactionRepos = {
  organization: Pick<
    OrganizationRepository,
    "upsertOrganization" | "upsertMembership"
  >;
  cadence: Pick<ContactCadenceRepo, "findMany">;
  contactAssignments: Pick<ContactAssignmentsRepo, "createMany">;
};

export type AssignContactsUow = AppUow<AssignContactsTransactionRepos>;

// One organization per RUC: upsert each distinct RUC once.
async function upsertOrganizationsByRuc(
  candidates: RecordCandidate[],
  organizations: AssignContactsTransactionRepos["organization"],
): Promise<Map<string, OrganizationId>> {
  const byRuc = new Map<string, RecordCandidate>();
  for (const candidate of candidates) {
    if (!byRuc.has(candidate.ruc)) byRuc.set(candidate.ruc, candidate);
  }

  const entries = await Promise.all(
    [...byRuc].map(async ([ruc, candidate]) => {
      const organization = await organizations.upsertOrganization({
        ruc,
        legalName: candidate.organization_name,
      });
      return [ruc, organization.id] as const;
    }),
  );
  return new Map(entries);
}

// One membership per (organization, DNI): upsert each distinct person once and
// return the resulting membership ids.
async function upsertMembershipsForCandidates(
  candidates: RecordCandidate[],
  organizationIdsByRuc: Map<string, OrganizationId>,
  organizations: AssignContactsTransactionRepos["organization"],
): Promise<OrganizationPersonId[]> {
  const byKey = new Map<
    string,
    { organizationId: OrganizationId; candidate: RecordCandidate }
  >();
  for (const candidate of candidates) {
    const organizationId = organizationIdsByRuc.get(candidate.ruc);
    if (organizationId === undefined) continue;
    const key = `${organizationId}:${candidate.dni}`;
    if (!byKey.has(key)) byKey.set(key, { organizationId, candidate });
  }

  return Promise.all(
    [...byKey.values()].map(async ({ organizationId, candidate }) => {
      const membership = await organizations.upsertMembership({
        organizationId,
        person: {
          dni: candidate.dni,
          names: candidate.person_name,
          firstSurname: null,
          secondSurname: null,
          email: null,
        },
        phone: candidate.phone_primary,
        email: null,
      });
      return membership.id;
    }),
  );
}

export async function createContactAssignmentsFromCandidates(input: {
  actorUserId: UserId;
  candidates: RecordCandidate[];
  uow: AssignContactsUow;
}): Promise<Result<number, DomainError>> {
  return input.uow.run(async (repos) => {
    const organizationIdsByRuc = await upsertOrganizationsByRuc(
      input.candidates,
      repos.organization,
    );
    const membershipIds = await upsertMembershipsForCandidates(
      input.candidates,
      organizationIdsByRuc,
      repos.organization,
    );

    const cadenceById = await repos.cadence.findMany(membershipIds);
    const assignments = membershipIds
      .filter((id) =>
        canContactNow({ cooldown_until: cadenceById.get(id)?.cooldownUntil ?? null }),
      )
      .map((id) => createAssignment(input.actorUserId, id));

    if (assignments.length > 0) {
      await repos.contactAssignments.createMany(assignments);
    }
    return Ok(assignments.length);
  });
}
