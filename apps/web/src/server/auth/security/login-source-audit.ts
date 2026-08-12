import type { Selectable } from "kysely";

import { auditEntityId } from "~/domain/audit/entity";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import type { EventsWriter } from "~/server/event-logs/events-repo";
import type { UsersTable } from "~/server/platform/database/types";
import type { SessionRepository } from "~/server/sessions/repos-sessions";

type Deps = {
  sessions: Pick<SessionRepository, "hasRecentForUserAndIp">;
  events: Pick<EventsWriter, "append">;
};

const LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;

type UserRow = Selectable<UsersTable>;

// Detects the fact only. Whether this fact is worth notifying anyone about
// is a separate decision, owned by the "security.privileged_login" entry in
// notifications/policy/registry.ts.
export async function recordNewLoginSource(params: {
  user: Pick<
    UserRow,
    "id" | "email" | "names" | "first_surname" | "second_surname" | "role"
  >;
  ipAddress: string;
  method: string;
  occurredAt: Date;
  deps: Deps;
}): Promise<void> {
  if (!requiresStrongAuthRole(params.user.role)) {
    return;
  }

  const knownIp = await params.deps.sessions.hasRecentForUserAndIp(
    params.user.id,
    params.ipAddress,
    new Date(params.occurredAt.getTime() - LOOKBACK_MS),
  );
  if (knownIp) {
    return;
  }

  await params.deps.events.append({
    type: "security.privileged_login",
    entityType: "user",
    entityId: auditEntityId("user", params.user.id),
    actorUserId: params.user.id,
    subjectUserId: params.user.id,
    payload: {
      ipAddress: params.ipAddress,
      method: params.method,
      role: params.user.role,
      names: params.user.names,
      firstSurname: params.user.first_surname,
      secondSurname: params.user.second_surname,
      email: params.user.email,
    },
    occurredAt: params.occurredAt,
  });
}
