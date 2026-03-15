import type { SessionData } from "~/lib/auth/access/session";
import type { Repositories } from "~/server/shared/registry";

import { canManageExecutive } from "../capacity/scope";
import { createSearchAllowanceService } from "./allowance-service";

export function createSearchReadService(repos: Repositories) {
  const allowance = createSearchAllowanceService(repos);

  return {
    getMySearchSnapshot(userId: number) {
      return allowance.getCurrentSearchAllowance(userId);
    },

    async getExecutiveSearchSnapshot(
      session: SessionData,
      targetUserId: number,
    ) {
      const managed = await canManageExecutive(session, targetUserId, repos);
      if (!managed.ok) {
        throw new Error("Forbidden");
      }
      return allowance.getCurrentSearchAllowance(targetUserId);
    },
  };
}
