import type { SessionData } from "~/lib/auth/access/session";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CapacityReadError } from "../errors";

export async function listPendingCapacityRequests(
  repos: Repositories,
  session: SessionData,
): Promise<
  Result<
    Awaited<
      ReturnType<Repositories["capacityRequests"]["listPendingByBranch"]>
    >,
    CapacityReadError
  >
> {
  try {
    const pending = await repos.capacityRequests.listPendingByBranch(
      session.branchId,
    );
    if (session.role !== "supervisor") {
      return Ok(pending);
    }
    const supervisedTeam = await repos.teams.findBySupervisorId(session.userId);
    if (!supervisedTeam) {
      return Ok([]);
    }
    return Ok(
      pending.filter((request) => request.team_id === supervisedTeam.id),
    );
  } catch (error) {
    return Err({
      reason: "unexpected",
      message:
        error instanceof Error
          ? error.message
          : "Failed to list pending capacity requests",
    });
  }
}
