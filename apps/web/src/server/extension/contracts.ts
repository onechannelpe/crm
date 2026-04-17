import { isPlainRecord } from "~/lib/type-guards";
import type { AssignmentId, ContactId, TeamId, UserId } from "~/server/shared/ids";

export const EXTENSION_HANDOFF_TOKEN_ISSUER = "web" as const;
export const EXTENSION_HANDOFF_TOKEN_AUDIENCE = "crm-extension" as const;
export const EXTENSION_SESSION_TOKEN_AUDIENCE =
  "crm-extension-session" as const;

export const EXTENSION_EXECUTIVE_PRESENCE_STATUSES = [
  "idle",
  "ready",
  "dialing",
  "active",
  "wrap_up",
  "offline",
] as const;

export type ExtensionExecutivePresenceStatus =
  (typeof EXTENSION_EXECUTIVE_PRESENCE_STATUSES)[number];

export const EXTENSION_SYNC_HEALTHS = [
  "ok",
  "stale",
  "reauth_required",
] as const;

export type ExtensionSyncHealth = (typeof EXTENSION_SYNC_HEALTHS)[number];

export const EXTENSION_RUNTIME_EVENT_TYPES = [
  "executive.presence",
  "executive.heartbeat",
  "call.lifecycle",
  "call.metric",
  "recording.completed",
  "recording.chunk",
] as const;

export type ExtensionRuntimeEventType =
  (typeof EXTENSION_RUNTIME_EVENT_TYPES)[number];

export interface ExtensionHandoffClaims {
  iss: typeof EXTENSION_HANDOFF_TOKEN_ISSUER;
  aud: typeof EXTENSION_HANDOFF_TOKEN_AUDIENCE;
  sub: `user:${number}`;
  authSessionId: string;
  branchId: number;
  assignmentId: number;
  contactId: number;
  phone: string;
  clientName: string | null;
  organizationLabel: string | null;
  action: "start_call";
  origin: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface ExtensionInstallationSessionClaims {
  iss: typeof EXTENSION_HANDOFF_TOKEN_ISSUER;
  aud: typeof EXTENSION_SESSION_TOKEN_AUDIENCE;
  sub: `user:${number}`;
  authSessionId: string;
  branchId: number;
  installationId: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface CreateExtensionHandoffTokenRequest {
  assignmentId: number;
}

export interface CreateExtensionHandoffTokenResponse {
  handoffToken: string;
  expiresAt: number;
}

export interface ClaimExtensionSessionRequest {
  handoffToken: string;
  installationId: string;
}

export interface ClaimExtensionSessionResponse {
  sessionToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface RefreshExtensionSessionRequest {
  refreshToken: string;
  installationId: string;
}

export interface RefreshExtensionSessionResponse {
  sessionToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface ExecutivePresenceEventPayload {
  presenceStatus: Exclude<ExtensionExecutivePresenceStatus, "offline">;
  assignmentId: number | null;
  contactId: number | null;
  callSessionId: string | null;
  updatedAt: number;
}

export interface ExecutiveHeartbeatPayload {
  occurredAt: number;
}

export interface CallLifecycleStartedPayload {
  event: "started";
  sessionId: string;
  assignmentId: number;
  contactId: number;
  phone: string;
  at: number;
}

export interface CallLifecycleConnectedPayload {
  event: "connected";
  sessionId: string;
  at: number;
}

export interface CallLifecycleEndedPayload {
  event: "ended";
  sessionId: string;
  outcome?: string;
  notes?: string | null;
  at: number;
}

export type CallLifecyclePayload =
  | CallLifecycleStartedPayload
  | CallLifecycleConnectedPayload
  | CallLifecycleEndedPayload;

export interface CallMetricPayload {
  event: "between_calls" | "duration";
  sessionId: string;
  [key: string]: unknown;
}

export interface RecordingCompletedPayload {
  sessionId: string;
  createdAt: number;
}

export interface RecordingChunkPayload {
  sessionId: string;
  chunkId: string;
  mimeType?: string;
  durationMs?: number;
  createdAt: number;
  payloadStorage?: string;
}

export type ExtensionRuntimeEventPayloadByType = {
  "executive.presence": ExecutivePresenceEventPayload;
  "executive.heartbeat": ExecutiveHeartbeatPayload;
  "call.lifecycle": CallLifecyclePayload;
  "call.metric": CallMetricPayload;
  "recording.completed": RecordingCompletedPayload;
  "recording.chunk": RecordingChunkPayload;
};

export type ExtensionRuntimeEventEnvelope = {
  [K in ExtensionRuntimeEventType]: {
    id: string;
    sequence: number;
    type: K;
    createdAt: number;
    payload: ExtensionRuntimeEventPayloadByType[K];
  };
}[ExtensionRuntimeEventType];

export interface TeamExecutiveStatusView {
  userId: UserId;
  names: string;
  firstSurname: string;
  teamId: TeamId | null;
  teamName: string | null;
  presenceStatus: ExtensionExecutivePresenceStatus | null;
  syncHealth: ExtensionSyncHealth;
  assignmentId: AssignmentId | null;
  contactId: ContactId | null;
  callSessionId: string | null;
  presenceUpdatedAt: number | null;
  syncUpdatedAt: number | null;
}

export function isExtensionExecutivePresenceStatus(
  value: unknown,
): value is ExtensionExecutivePresenceStatus {
  return (
    typeof value === "string" &&
    EXTENSION_EXECUTIVE_PRESENCE_STATUSES.some((status) => status === value)
  );
}

export function isExtensionSyncHealth(
  value: unknown,
): value is ExtensionSyncHealth {
  return (
    typeof value === "string" &&
    EXTENSION_SYNC_HEALTHS.some((syncHealth) => syncHealth === value)
  );
}

export function isCreateExtensionHandoffTokenRequest(
  value: unknown,
): value is CreateExtensionHandoffTokenRequest {
  return isPlainRecord(value) && typeof value.assignmentId === "number";
}

export function isClaimExtensionSessionRequest(
  value: unknown,
): value is ClaimExtensionSessionRequest {
  return (
    isPlainRecord(value) &&
    typeof value.handoffToken === "string" &&
    typeof value.installationId === "string"
  );
}

export function isRefreshExtensionSessionRequest(
  value: unknown,
): value is RefreshExtensionSessionRequest {
  return (
    isPlainRecord(value) &&
    typeof value.refreshToken === "string" &&
    typeof value.installationId === "string"
  );
}

function isExecutivePresencePayload(
  value: unknown,
): value is ExecutivePresenceEventPayload {
  return (
    isPlainRecord(value) &&
    isExtensionExecutivePresenceStatus(value.presenceStatus) &&
    value.presenceStatus !== "offline" &&
    (value.assignmentId === null || typeof value.assignmentId === "number") &&
    (value.contactId === null || typeof value.contactId === "number") &&
    (value.callSessionId === null || typeof value.callSessionId === "string") &&
    typeof value.updatedAt === "number"
  );
}

function isCallLifecyclePayload(value: unknown): value is CallLifecyclePayload {
  if (!isPlainRecord(value) || typeof value.event !== "string") {
    return false;
  }

  switch (value.event) {
    case "started":
      return (
        typeof value.sessionId === "string" &&
        typeof value.assignmentId === "number" &&
        typeof value.contactId === "number" &&
        typeof value.phone === "string" &&
        typeof value.at === "number"
      );
    case "connected":
      return (
        typeof value.sessionId === "string" && typeof value.at === "number"
      );
    case "ended":
      return (
        typeof value.sessionId === "string" &&
        typeof value.at === "number" &&
        (value.outcome === undefined || typeof value.outcome === "string") &&
        (value.notes === undefined ||
          value.notes === null ||
          typeof value.notes === "string")
      );
    default:
      return false;
  }
}

function isExecutiveHeartbeatPayload(
  value: unknown,
): value is ExecutiveHeartbeatPayload {
  return isPlainRecord(value) && typeof value.occurredAt === "number";
}

function isCallMetricPayload(value: unknown): value is CallMetricPayload {
  return (
    isPlainRecord(value) &&
    typeof value.event === "string" &&
    typeof value.sessionId === "string"
  );
}

function isRecordingCompletedPayload(
  value: unknown,
): value is RecordingCompletedPayload {
  return (
    isPlainRecord(value) &&
    typeof value.sessionId === "string" &&
    typeof value.createdAt === "number"
  );
}

function isRecordingChunkPayload(
  value: unknown,
): value is RecordingChunkPayload {
  return (
    isPlainRecord(value) &&
    typeof value.sessionId === "string" &&
    typeof value.chunkId === "string" &&
    typeof value.createdAt === "number" &&
    (value.mimeType === undefined || typeof value.mimeType === "string") &&
    (value.durationMs === undefined || typeof value.durationMs === "number") &&
    (value.payloadStorage === undefined ||
      typeof value.payloadStorage === "string")
  );
}

export function isExtensionRuntimeEventEnvelope(
  value: unknown,
): value is ExtensionRuntimeEventEnvelope {
  if (
    !isPlainRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.sequence !== "number" ||
    typeof value.type !== "string" ||
    typeof value.createdAt !== "number"
  ) {
    return false;
  }

  switch (value.type) {
    case "executive.presence":
      return isExecutivePresencePayload(value.payload);
    case "executive.heartbeat":
      return isExecutiveHeartbeatPayload(value.payload);
    case "call.lifecycle":
      return isCallLifecyclePayload(value.payload);
    case "call.metric":
      return isCallMetricPayload(value.payload);
    case "recording.completed":
      return isRecordingCompletedPayload(value.payload);
    case "recording.chunk":
      return isRecordingChunkPayload(value.payload);
    default:
      return false;
  }
}
