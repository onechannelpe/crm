import type { RecordCandidate } from "~/contracts/engine/record-api.generated";
import type { DomainError } from "~/domain/errors";
import type {
  OrganizationId,
  OrganizationPersonId,
  UserId,
} from "~/domain/ids";
import { createAssignment } from "~/server/contact-assignments/domain/assignment";
import { canContactNow } from "~/server/contact-assignments/domain/cooldown";
import type { ContactAssignmentsRepo } from "~/server/contact-assignments/infrastructure/assignment-repo";
import type { ContactCadenceRepo } from "~/server/contact-assignments/infrastructure/cadence-repo";
import type { OrganizationRepository } from "~/server/organization/organization-repo";
import type { AppUow } from "~/server/platform/database/uow";
import { Ok, type Result } from "~/shared/result";

export type AssignContactsTransactionRepos = {
  organization: Pick<
    OrganizationRepository,
    "upsertOrganization" | "upsertMembership"
  >;
  cadence: Pick<ContactCadenceRepo, "findMany">;
  contactAssignments: Pick<ContactAssignmentsRepo, "createMany">;
};

export type AssignContactsUow = AppUow<AssignContactsTransactionRepos>;

// Upsert by RUC; returns the resulting organization id.
async function upsertOrganizationsByRuc(
  candidates: RecordCandidate[],
  organizations: AssignContactsTransactionRepos["organization"],
  at: Date,
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
        at,
      });
      return [ruc, organization.id] as const;
    }),
  );
  return new Map(entries);
}

// Upsert by (organization, DNI); returns the resulting membership ids.
async function upsertMembershipsForCandidates(
  candidates: RecordCandidate[],
  organizationIdsByRuc: Map<string, OrganizationId>,
  organizations: AssignContactsTransactionRepos["organization"],
  at: Date,
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
        at,
      });
      return membership.id;
    }),
  );
}

export async function createContactAssignmentsFromCandidates(input: {
  actorUserId: UserId;
  candidates: RecordCandidate[];
  uow: AssignContactsUow;
  at: Date;
}): Promise<Result<number, DomainError>> {
  return input.uow.run(async (repos) => {
    const organizationIdsByRuc = await upsertOrganizationsByRuc(
      input.candidates,
      repos.organization,
      input.at,
    );
    const membershipIds = await upsertMembershipsForCandidates(
      input.candidates,
      organizationIdsByRuc,
      repos.organization,
      input.at,
    );

    const cadenceById = await repos.cadence.findMany(membershipIds);
    const assignments = membershipIds
      .filter((id) =>
        canContactNow(
          { cooldown_until: cadenceById.get(id)?.cooldownUntil ?? null },
          input.at,
        ),
      )
      .map((id) => createAssignment(input.actorUserId, id, input.at));

    if (assignments.length > 0) {
      await repos.contactAssignments.createMany(assignments);
    }
    return Ok(assignments.length);
  });
}
