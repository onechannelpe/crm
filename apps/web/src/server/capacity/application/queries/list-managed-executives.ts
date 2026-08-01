import type { ManagedExecutiveView } from "~/contracts/capacity";
import type { DomainError } from "~/domain/errors";
import { longName } from "~/domain/identity/display-name";
import type { BranchId, UserId } from "~/domain/ids";
import { getLeadCapacitySnapshot } from "~/server/capacity/application/queries/get-lead-capacity-snapshot";
import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import type { AppContext } from "~/server/platform/action/context";
import { isErr, Ok, type Result } from "~/shared/result";

import type { CapacityUser } from "../actor-scope";
import { canManageExecutive } from "../authorize-capacity-actor";

interface ManagedExecutivesDeps {
  repos: Omit<Parameters<typeof getSearchCapacitySnapshot>[1], "users"> &
    Omit<Parameters<typeof getLeadCapacitySnapshot>[1], "users"> & {
      users: {
        findById(id: UserId): Promise<CapacityUser | undefined>;
        findByBranch(branchId: BranchId): Promise<CapacityUser[]>;
        findAllActive(): Promise<CapacityUser[]>;
      };
    };
}

export async function listManagedExecutives(
  ctx: AppContext,
  deps: ManagedExecutivesDeps,
): Promise<Result<ManagedExecutiveView[], DomainError>> {
  const users =
    ctx.actor.role === "superuser"
      ? await deps.repos.users.findAllActive()
      : await deps.repos.users.findByBranch(ctx.actor.branchId);
  const evaluatedAt = ctx.operationAt;

  const summaries = await Promise.all(
    users.map(async (user) => {
      const managed = await canManageExecutive(ctx.actor, user.id, deps.repos);
      if (!managed.ok) return null;

      const [searchStatus, leadStatus] = await Promise.all([
        getSearchCapacitySnapshot(user.id, deps.repos, evaluatedAt),
        getLeadCapacitySnapshot(user.id, deps.repos, evaluatedAt),
      ]);
      if (isErr(searchStatus) || isErr(leadStatus)) return null;

      return {
        id: user.id,
        fullName: longName(user),
        email: user.email,
        teamId: user.teamId,
        executiveCategory: user.executiveCategory,
        searchStatus: searchStatus.value,
        leadStatus: leadStatus.value,
      };
    }),
  );

  const visible = summaries.filter((value) => value !== null);
  return Ok(visible.toSorted((a, b) => a.fullName.localeCompare(b.fullName)));
}
