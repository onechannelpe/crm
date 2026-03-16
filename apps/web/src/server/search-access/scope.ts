import type { SessionData } from "~/lib/auth/access/session";

export function canReadOwnSearchAllowance(actor: SessionData, userId: number) {
  if (actor.role === "superuser") {
    return true;
  }
  return actor.userId === userId;
}
