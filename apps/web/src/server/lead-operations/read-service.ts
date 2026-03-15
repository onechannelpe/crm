import type { SessionData } from "~/lib/auth/access/session";
import type { Repositories } from "~/server/shared/registry";

import { canManageExecutive } from "../capacity/scope";
import { createLeadRefillService } from "./refill-service";

export function createLeadReadService(repos: Repositories) {
  const refill = createLeadRefillService(repos);

  return {
    getMyLeadSnapshot(userId: number) {
      return refill.getCurrentLeadCapacity(userId);
    },

    async getExecutiveLeadSnapshot(session: SessionData, targetUserId: number) {
      const managed = await canManageExecutive(session, targetUserId, repos);
      if (!managed.ok) {
        throw new Error("Forbidden");
      }
      return refill.getCurrentLeadCapacity(targetUserId);
    },
  };
}
