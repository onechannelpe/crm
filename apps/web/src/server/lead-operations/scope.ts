import type { SessionData } from "~/lib/auth/access/session";

export function canExecuteLeadWork(actor: SessionData, userId: number) {
  if (actor.role === "superuser") {
    return true;
  }
  return actor.userId === userId;
}
