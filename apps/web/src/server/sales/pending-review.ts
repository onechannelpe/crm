import type { Role } from "~/lib/auth/access/rbac";
import type { Repositories } from "~/server/shared/registry";

type PendingReviewNote = Awaited<
  ReturnType<Repositories["chargeNotes"]["findPendingReviewWithContacts"]>
>[number];

interface PendingReviewSession {
  role: Role;
  branchId: number;
}

interface PendingReviewDeps {
  repos: Pick<Repositories, "chargeNotes">;
}

export async function getPendingReviewNotesForSession(
  deps: PendingReviewDeps,
  session: PendingReviewSession,
): Promise<PendingReviewNote[]> {
  if (session.role === "superuser") {
    return deps.repos.chargeNotes.findPendingReviewWithContacts();
  }

  return deps.repos.chargeNotes.findPendingReviewWithContactsByBranch(
    session.branchId,
  );
}
