export const EXTENSION_PRESENCE_STATUSES = [
  "idle",
  "ready",
  "dialing",
  "active",
  "wrap_up",
] as const;

export const EXTENSION_SYNC_HEALTH_STATUSES = [
  "ok",
  "pending",
  "error",
  "reauth_required",
] as const;

export type ExecutivePresenceStatus =
  (typeof EXTENSION_PRESENCE_STATUSES)[number];

export type SyncHealth = (typeof EXTENSION_SYNC_HEALTH_STATUSES)[number];

export interface ExecutiveStateSnapshot {
  presenceStatus: ExecutivePresenceStatus;
  syncHealth: SyncHealth;
  assignmentId: number | null;
  contactId: number | null;
  phone: string | null;
  presenceUpdatedAt: number | null;
  syncUpdatedAt: number | null;
}

export interface StateGetMessage {
  type: "state.get";
}

export interface AssignmentHandoffMessage {
  type: "assignment.handoff";
  token: string;
}

export type ExternalRuntimeMessage = StateGetMessage | AssignmentHandoffMessage;

export interface BridgeSuccessResponse {
  ok: true;
  executiveState: ExecutiveStateSnapshot;
}

export interface BridgeErrorResponse {
  ok: false;
  error: string;
  executiveState?: ExecutiveStateSnapshot;
}

export type BridgeResponse = BridgeSuccessResponse | BridgeErrorResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isExecutivePresenceStatus(
  value: unknown,
): value is ExecutivePresenceStatus {
  return (
    typeof value === "string" &&
    EXTENSION_PRESENCE_STATUSES.includes(value as ExecutivePresenceStatus)
  );
}

export function isSyncHealth(value: unknown): value is SyncHealth {
  return (
    typeof value === "string" &&
    EXTENSION_SYNC_HEALTH_STATUSES.includes(value as SyncHealth)
  );
}

export function isExecutiveStateSnapshot(
  value: unknown,
): value is ExecutiveStateSnapshot {
  return (
    isRecord(value) &&
    isExecutivePresenceStatus(value.presenceStatus) &&
    isSyncHealth(value.syncHealth) &&
    (value.assignmentId === null || typeof value.assignmentId === "number") &&
    (value.contactId === null || typeof value.contactId === "number") &&
    (value.phone === null || typeof value.phone === "string") &&
    (value.presenceUpdatedAt === null ||
      typeof value.presenceUpdatedAt === "number") &&
    (value.syncUpdatedAt === null || typeof value.syncUpdatedAt === "number")
  );
}

export function isExternalRuntimeMessage(
  value: unknown,
): value is ExternalRuntimeMessage {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case "state.get":
      return true;
    case "assignment.handoff":
      return typeof value.token === "string";
    default:
      return false;
  }
}

export function isBridgeResponse(value: unknown): value is BridgeResponse {
  if (!isRecord(value) || typeof value.ok !== "boolean") {
    return false;
  }

  if (value.ok) {
    return isExecutiveStateSnapshot(value.executiveState);
  }

  return (
    typeof value.error === "string" &&
    (value.executiveState === undefined ||
      isExecutiveStateSnapshot(value.executiveState))
  );
}
