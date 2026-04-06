import type { UserId } from "~/server/shared/ids";

import type { ActiveContactAssignmentView } from "./views/active-contact-assignment-view";

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
