import { longName } from "~/lib/users/display-name";
import { getLeadCapacitySnapshot } from "~/server/capacity/application/get-lead-capacity-snapshot";
import { getSearchCapacitySnapshot } from "~/server/capacity/application/get-search-capacity-snapshot";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../domain/access-policy";
import type { CapacityReadContext } from "../infrastructure/read-context";
import type { ManagedExecutiveView } from "./contracts";

export async function listManagedExecutives(
  ctx: AppContext,
  deps: CapacityReadContext,
): Promise<Result<ManagedExecutiveView[], DomainError>> {
  const users =
    ctx.actor.role === "superuser"
      ? await deps.repos.users.findAllActive()
      : await deps.repos.users.findByBranch(ctx.actor.branchId);

  const summaries = await Promise.all(
    users.map(async (user) => {
      const managed = await canManageExecutive(ctx.actor, user.id, deps.repos);
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
        teamId: user.teamId,
        executiveCategory: user.executiveCategory,
        searchStatus: searchStatus.value,
        leadStatus: leadStatus.value,
      };
    }),
  );

  return Ok(
    summaries
      .filter((value): value is ManagedExecutiveView => value !== null)
      .toSorted((a, b) => a.fullName.localeCompare(b.fullName)),
  );
}
