import type { ActiveContactAssignmentView } from "~/contracts/contact-assignments/views";
import type { ContactAssignmentsRepo } from "~/server/contact-assignments/infrastructure/assignment-repo";
import type { UserId } from "~/server/shared/ids";
import { epochMilliseconds } from "~/server/shared/time";

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
