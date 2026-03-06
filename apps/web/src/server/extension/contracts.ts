export const EXTENSION_HANDOFF_TOKEN_ISSUER = "crm-web" as const;
export const EXTENSION_HANDOFF_TOKEN_AUDIENCE = "crm-extension" as const;
export const EXTENSION_SYNC_TOKEN_AUDIENCE = "crm-extension-events" as const;

export const EXTENSION_EXECUTIVE_STATUSES = [
  "idle",
  "ready",
  "dialing",
  "active",
  "wrap_up",
  "sync_pending",
  "sync_error",
  "offline",
] as const;

export type ExtensionExecutiveStatus =
  (typeof EXTENSION_EXECUTIVE_STATUSES)[number];

export const EXTENSION_RUNTIME_EVENT_TYPES = [
  "executive.status",
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
  syncToken: string;
  origin: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface ExtensionSyncClaims {
  iss: typeof EXTENSION_HANDOFF_TOKEN_ISSUER;
  aud: typeof EXTENSION_SYNC_TOKEN_AUDIENCE;
  sub: `user:${number}`;
  authSessionId: string;
  branchId: number;
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

export interface ExecutiveStatusEventPayload {
  status: ExtensionExecutiveStatus;
  assignmentId: number | null;
  contactId: number | null;
  callSessionId: string | null;
  updatedAt: number;
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
  "executive.status": ExecutiveStatusEventPayload;
  "call.lifecycle": CallLifecyclePayload;
  "call.metric": CallMetricPayload;
  "recording.completed": RecordingCompletedPayload;
  "recording.chunk": RecordingChunkPayload;
};

export type ExtensionRuntimeEventEnvelope =
  {
    [K in ExtensionRuntimeEventType]: {
      id: string;
      type: K;
      createdAt: number;
      payload: ExtensionRuntimeEventPayloadByType[K];
    };
  }[ExtensionRuntimeEventType];

export interface TeamExecutiveStatusView {
  userId: number;
  names: string;
  firstSurname: string;
  teamId: number | null;
  teamName: string | null;
  status: ExtensionExecutiveStatus;
  assignmentId: number | null;
  contactId: number | null;
  callSessionId: string | null;
  updatedAt: number;
}

export function isExtensionExecutiveStatus(
  value: unknown,
): value is ExtensionExecutiveStatus {
  return (
    typeof value === "string" &&
    EXTENSION_EXECUTIVE_STATUSES.some((status) => status === value)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isCreateExtensionHandoffTokenRequest(
  value: unknown,
): value is CreateExtensionHandoffTokenRequest {
  return isObject(value) && typeof value.assignmentId === "number";
}

function isExecutiveStatusPayload(value: unknown): value is ExecutiveStatusEventPayload {
  return (
    isObject(value) &&
    isExtensionExecutiveStatus(value.status) &&
    (value.assignmentId === null || typeof value.assignmentId === "number") &&
    (value.contactId === null || typeof value.contactId === "number") &&
    (value.callSessionId === null || typeof value.callSessionId === "string") &&
    typeof value.updatedAt === "number"
  );
}

function isCallLifecyclePayload(value: unknown): value is CallLifecyclePayload {
  if (!isObject(value) || typeof value.event !== "string") {
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
      return typeof value.sessionId === "string" && typeof value.at === "number";
    case "ended":
      return (
        typeof value.sessionId === "string" &&
        typeof value.at === "number" &&
        (value.outcome === undefined || typeof value.outcome === "string") &&
        (value.notes === undefined || value.notes === null || typeof value.notes === "string")
      );
    default:
      return false;
  }
}

function isCallMetricPayload(value: unknown): value is CallMetricPayload {
  return (
    isObject(value) &&
    typeof value.event === "string" &&
    typeof value.sessionId === "string"
  );
}

function isRecordingCompletedPayload(
  value: unknown,
): value is RecordingCompletedPayload {
  return (
    isObject(value) &&
    typeof value.sessionId === "string" &&
    typeof value.createdAt === "number"
  );
}

function isRecordingChunkPayload(value: unknown): value is RecordingChunkPayload {
  return (
    isObject(value) &&
    typeof value.sessionId === "string" &&
    typeof value.chunkId === "string" &&
    typeof value.createdAt === "number" &&
    (value.mimeType === undefined || typeof value.mimeType === "string") &&
    (value.durationMs === undefined || typeof value.durationMs === "number") &&
    (value.payloadStorage === undefined || typeof value.payloadStorage === "string")
  );
}

export function isExtensionRuntimeEventEnvelope(
  value: unknown,
): value is ExtensionRuntimeEventEnvelope {
  if (
    !isObject(value) ||
    typeof value.id !== "string" ||
    typeof value.type !== "string" ||
    typeof value.createdAt !== "number"
  ) {
    return false;
  }

  switch (value.type) {
    case "executive.status":
      return isExecutiveStatusPayload(value.payload);
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
