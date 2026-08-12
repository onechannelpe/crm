import type { EventId, UserId } from "~/domain/ids";

import type { NotificationIntent } from "../types";

// What a domain event carries into policy evaluation. `payload` is the
// persisted, audited fact. `notificationContext` is throwaway denormalized
// data (e.g. a lead's ruc/executive/branch) the writer already had in scope,
// offered so the policy stays pure and never needs its own DB access.
export type NotificationPolicyEvent = {
  eventId: EventId;
  entityId: string;
  actorUserId: UserId | null;
  subjectUserId: UserId | null;
  occurredAt: Date;
  payload: unknown;
  notificationContext: unknown;
};

export type NotificationPolicy = {
  buildIntent: (event: NotificationPolicyEvent) => NotificationIntent | null;
};
