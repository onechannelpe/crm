import type { ActiveContactAssignmentView } from "~/contracts/contact-assignments/views";
import type { UserId } from "~/server/shared/ids";

export type ContactAssignmentReadRepos = {
  contactAssignments: {
    findActiveByUserWithContacts: (
      userId: UserId,
    ) => Promise<ActiveContactAssignmentView[]>;
  };
};

export async function getActiveContactAssignments(
  actorUserId: UserId,
  repos: ContactAssignmentReadRepos,
): Promise<ActiveContactAssignmentView[]> {
  return repos.contactAssignments.findActiveByUserWithContacts(actorUserId);
}
