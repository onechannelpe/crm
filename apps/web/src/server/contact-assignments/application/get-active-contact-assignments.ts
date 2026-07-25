import type { ActiveContactAssignmentView } from "~/contracts/contact-assignments/views";
import type { UserId } from "~/domain/ids";
import { epochMilliseconds } from "~/domain/time/epoch";
import type { ContactAssignmentsRepo } from "~/server/contact-assignments/infrastructure/assignment-repo";

export type ContactAssignmentReadRepos = {
  contactAssignments: Pick<
    ContactAssignmentsRepo,
    "findActiveByUserWithContacts"
  >;
};

export async function getActiveContactAssignments(
  actorUserId: UserId,
  repos: ContactAssignmentReadRepos,
): Promise<ActiveContactAssignmentView[]> {
  const rows =
    await repos.contactAssignments.findActiveByUserWithContacts(actorUserId);

  return rows.map((row) => ({
    assignmentId: row.assignmentId,
    assignedAt: epochMilliseconds(row.assignedAt),
    expiresAt: epochMilliseconds(row.expiresAt),
    status: row.status,
    contactId: row.contactId,
    name: row.name,
    dni: row.dni,
    phonePrimary: row.phonePrimary,
    organizationId: row.organizationId,
  }));
}
