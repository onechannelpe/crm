import type { EventsWriter } from "~/server/event-logs/events-repo";
import type { createExtensionRuntimeRepo } from "~/server/extension/repos";
import type { AppUow } from "~/server/platform/database/uow";
import type { createSessionRepository } from "~/server/sessions/repos-sessions";

export type SessionRevocationTx = {
  sessions: ReturnType<typeof createSessionRepository>;
  extensionRuntime: ReturnType<typeof createExtensionRuntimeRepo>;
  events: EventsWriter;
};

export type SessionRevocationDeps = {
  uow: AppUow<SessionRevocationTx>;
};
