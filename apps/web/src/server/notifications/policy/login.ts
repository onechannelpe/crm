import { isRole, type Role } from "~/domain/auth/access/rbac";
import { getRoleLabel } from "~/domain/auth/access/role-display";
import { longName } from "~/domain/identity/display-name";
import { NotificationIntentId } from "~/domain/ids";
import { isPlainRecord } from "~/shared/type-guards";

import type { NotificationIntent } from "../types";
import type { NotificationPolicyEvent } from "./types";

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

export function buildPrivilegedLoginIntent(
  event: NotificationPolicyEvent,
): NotificationIntent | null {
  if (
    event.subjectUserId === null ||
    !isPrivilegedLoginPayload(event.payload)
  ) {
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
