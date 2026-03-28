import { longName } from "~/lib/users/display-name";
import {
  getLeadCapacitySnapshot,
  type LeadCapacitySnapshot,
} from "~/server/capacity/application/get-lead-capacity-snapshot";
import {
  getSearchCapacitySnapshot,
  type SearchCapacitySnapshot,
} from "~/server/capacity/application/get-search-capacity-snapshot";
import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../domain/access-policy";
import type { CapacityDeps } from "../infrastructure/deps";

export type { SearchCapacitySnapshot, LeadCapacitySnapshot };

export type ManagedExecutiveSummary = {
  id: number;
  fullName: string;
  email: string;
  teamId: number | null;
  searchStatus: SearchCapacitySnapshot;
  leadStatus: LeadCapacitySnapshot;
};

export async function listManagedExecutives(
  ctx: AppContext,
  deps: Pick<CapacityDeps, "repos">,
): Promise<Result<ManagedExecutiveSummary[], DomainError>> {
  try {
    const users =
      ctx.actor.role === "superuser"
        ? await deps.repos.users.findAllActive()
        : await deps.repos.users.findByBranch(ctx.actor.branchId);

    const summaries = await Promise.all(
      users.map(async (user) => {
        const managed = await canManageExecutive(
          ctx.actor,
          user.id,
          deps.repos,
        );
        if (!managed.ok) return null;

        const [searchStatus, leadStatus] = await Promise.all([
          getSearchCapacitySnapshot(user.id, deps.repos),
          getLeadCapacitySnapshot(user.id, deps.repos),
        ]);
        if (isErr(searchStatus) || isErr(leadStatus)) return null;

        return {
          id: user.id,
          fullName: longName(user),
          email: user.email,
          teamId: user.team_id,
          searchStatus: searchStatus.value,
          leadStatus: leadStatus.value,
        };
      }),
    );

    return Ok(
      summaries
        .filter((value): value is ManagedExecutiveSummary => value !== null)
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    );
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to list managed executives",
      ),
    );
  }
}
