import { isRole, type Role } from "~/domain/auth/access/rbac";
import { getRoleLabel } from "~/domain/auth/access/role-display";
import { longName } from "~/domain/identity/display-name";
import { NotificationIntentId, type EventId, type UserId } from "~/domain/ids";
import { isPlainRecord } from "~/shared/type-guards";

import type { NotificationIntent } from "../types";

// What a domain event carries into policy evaluation. Deliberately payload
// only, no DB access: a policy is a pure function from "this happened" to
// "here is the notification it produces," so it stays trivial to reason
// about and never adds a query to the appendEvents() write path.
export type NotificationPolicyEvent = {
  eventId: EventId;
  actorUserId: UserId | null;
  subjectUserId: UserId | null;
  occurredAt: Date;
  payload: unknown;
};

export type NotificationPolicy = {
  buildIntent: (event: NotificationPolicyEvent) => NotificationIntent | null;
};

// Registered by domain event `type`. A missing entry means the event is
// audit-only and never produces a notification; this is the single place
// that decides whether "something happened" also means "tell someone."
export const NOTIFICATION_EVENT_POLICIES: Partial<
  Record<string, NotificationPolicy>
> = {
  "security.privileged_login": { buildIntent: buildPrivilegedLoginIntent },
};

type PrivilegedLoginPayload = {
  ipAddress: string;
  method: string;
  role: Role;
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
};

function isPrivilegedLoginPayload(
  value: unknown,
): value is PrivilegedLoginPayload {
  return (
    isPlainRecord(value) &&
    typeof value["ipAddress"] === "string" &&
    typeof value["method"] === "string" &&
    typeof value["role"] === "string" &&
    isRole(value["role"]) &&
    typeof value["names"] === "string" &&
    typeof value["firstSurname"] === "string" &&
    typeof value["secondSurname"] === "string" &&
    typeof value["email"] === "string"
  );
}

function buildPrivilegedLoginIntent(
  event: NotificationPolicyEvent,
): NotificationIntent | null {
  if (event.subjectUserId === null || !isPrivilegedLoginPayload(event.payload)) {
    return null;
  }

  const { payload } = event;

  return {
    // One event never produces more than one notification, so the event's
    // own id is a sufficient idempotency key.
    id: NotificationIntentId.trust(`event:${event.eventId}`),
    eventType: "security.privileged_login",
    audience: { kind: "user_ids", userIds: [event.subjectUserId] },
    channels: ["in_app", "email", "whatsapp"],
    priority: "high",
    title: `Alerta de seguridad: acceso privilegiado (${getRoleLabel(payload.role)})`,
    bodyText: [
      "Se detectó un acceso privilegiado.",
      `Usuario: ${longName({
        names: payload.names,
        first_surname: payload.firstSurname,
        second_surname: payload.secondSurname,
      })} <${payload.email}>`,
      `Rol: ${getRoleLabel(payload.role)}`,
      `Método: ${payload.method}`,
      `IP: ${payload.ipAddress}`,
      `Hora: ${event.occurredAt.toISOString()}`,
    ].join("\n"),
    actionUrl: null,
  };
}
