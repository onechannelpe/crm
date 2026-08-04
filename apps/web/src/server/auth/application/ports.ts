import type { EventsWriter } from "~/server/event-logs/events-repo";
import type { createExtensionRuntimeRepo } from "~/server/extension/repos";
import type { AppUow } from "~/server/platform/database/uow";
import type { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { createUsersRepo } from "~/server/users/repos-users";

export type AccessSecurityTx = {
  users: ReturnType<typeof createUsersRepo>;
  sessions: ReturnType<typeof createSessionRepository>;
  extensionRuntime: ReturnType<typeof createExtensionRuntimeRepo>;
  events: EventsWriter;
};

export type AccessSecurityDeps = {
  uow: AppUow<AccessSecurityTx>;
};
