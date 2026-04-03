import type { UserId } from "~/server/shared/ids";

export type ContactAssignmentReadRepos = {
  contactAssignments: {
    findActiveByUserWithContacts: (userId: UserId) => Promise<
      Array<{
        assignmentId: number;
        assigned_at: number;
        expires_at: number;
        status: "active" | "completed" | "expired";
        contactId: number;
        name: string;
        dni: string;
        phone_primary: string | null;
        organization_id: number;
      }>
    >;
  };
};

export async function getActiveContactAssignments(
  actorUserId: UserId,
  repos: ContactAssignmentReadRepos,
) {
  return repos.contactAssignments.findActiveByUserWithContacts(actorUserId);
}
