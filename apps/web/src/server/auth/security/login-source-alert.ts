import type { Selectable } from "kysely";

import { getRoleLabel } from "~/domain/auth/access/role-display";
import { longName } from "~/domain/identity/display-name";
import { NotificationIntentId } from "~/domain/ids";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import type { NotificationIntent } from "~/server/notifications/types";
import type { UsersTable } from "~/server/platform/database/types";
import type { SessionRepository } from "~/server/sessions/repos-sessions";

type Deps = {
  sessions: Pick<SessionRepository, "hasRecentForUserAndIp">;
  notificationIntents: {
    enqueue(intents: NotificationIntent[], occurredAt: Date): Promise<void>;
  };
};

const LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;

type UserRow = Selectable<UsersTable>;

export async function enqueueAlertOnNewLoginSource(params: {
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

  await params.deps.notificationIntents.enqueue(
    [
      {
        id: NotificationIntentId.trust(
          `security:login:${params.user.id}:${params.occurredAt.toISOString()}`,
        ),
        eventType: "security.privileged_login",
        audience: { kind: "user_ids", userIds: [params.user.id] },
        channels: ["in_app", "email", "whatsapp"],
        priority: "high",
        title: `Alerta de seguridad: acceso privilegiado (${getRoleLabel(params.user.role)})`,
        bodyText: [
          "Se detectó un acceso privilegiado.",
          `Usuario: ${longName(params.user)} <${params.user.email}>`,
          `Rol: ${getRoleLabel(params.user.role)}`,
          `Método: ${params.method}`,
          `IP: ${params.ipAddress}`,
          `Hora: ${params.occurredAt.toISOString()}`,
        ].join("\n"),
        actionUrl: null,
      },
    ],
    params.occurredAt,
  );
}
