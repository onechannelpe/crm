export const STORAGE_KEY = "crm_extension_state_v1" as const;

export type CallPhase = "dialing" | "active" | "ended";

export type RecordingPhase = "idle" | "starting" | "recording" | "stopping" | "error";

export type ExecutiveStatus =
  | "idle"
  | "ready"
  | "dialing"
  | "active"
  | "wrap_up"
  | "sync_pending"
  | "sync_error";

export type QueueJobType =
  | "call.lifecycle"
  | "call.metric"
  | "recording.chunk"
  | "recording.completed";

export interface CallSession {
  sessionId: string;
  assignmentId: number;
  contactId: number;
  phone: string;
  startedAt: number;
  connectedAt: number | null;
  endedAt: number | null;
  phase: CallPhase;
  outcome: string | null;
  notes: string | null;
}

export interface AssignmentHandoff {
  assignmentId: number;
  contactId: number;
  phone: string;
  clientName: string | null;
  organizationLabel: string | null;
  receivedAt: number;
}

export interface RecordingState {
  phase: RecordingPhase;
  streamId: string | null;
  startedAt: number | null;
  stoppedAt: number | null;
  error: string | null;
  chunkCount: number;
}

export interface QueueJob {
  id: string;
  type: QueueJobType;
  payload: Record<string, unknown>;
  createdAt: number;
  attemptCount: number;
  nextAttemptAt: number;
  lastError: string | null;
}

export interface SyncConfig {
  apiBaseUrl: string | null;
  authToken: string | null;
}

export interface ExecutiveStateSnapshot {
  status: ExecutiveStatus;
  assignmentId: number | null;
  contactId: number | null;
  phone: string | null;
  updatedAt: number | null;
}

export interface ExtensionState {
  schemaVersion: 1;
  handoff: AssignmentHandoff | null;
  currentCall: CallSession | null;
  previousCallEndedAt: number | null;
  recording: RecordingState;
  queue: QueueJob[];
  syncConfig: SyncConfig;
  sync: {
    lastSyncAt: number | null;
    lastSyncError: string | null;
  };
}

export function createInitialState(): ExtensionState {
  return {
    schemaVersion: 1,
    handoff: null,
    currentCall: null,
    previousCallEndedAt: null,
    recording: {
      phase: "idle",
      streamId: null,
      startedAt: null,
      stoppedAt: null,
      error: null,
      chunkCount: 0,
    },
    queue: [],
    syncConfig: {
      apiBaseUrl: null,
      authToken: null,
    },
    sync: {
      lastSyncAt: null,
      lastSyncError: null,
    },
  };
}

export function getExecutiveState(state: ExtensionState): ExecutiveStateSnapshot {
  const activeCall = state.currentCall;
  if (activeCall?.phase === "dialing") {
    return {
      status: "dialing",
      assignmentId: activeCall.assignmentId,
      contactId: activeCall.contactId,
      phone: activeCall.phone,
      updatedAt: activeCall.startedAt,
    };
  }

  if (activeCall?.phase === "active") {
    return {
      status: "active",
      assignmentId: activeCall.assignmentId,
      contactId: activeCall.contactId,
      phone: activeCall.phone,
      updatedAt: activeCall.connectedAt ?? activeCall.startedAt,
    };
  }

  if (state.queue.length > 0 && state.sync.lastSyncError) {
    return {
      status: "sync_error",
      assignmentId: state.handoff?.assignmentId ?? activeCall?.assignmentId ?? null,
      contactId: state.handoff?.contactId ?? activeCall?.contactId ?? null,
      phone: state.handoff?.phone ?? activeCall?.phone ?? null,
      updatedAt: state.sync.lastSyncAt,
    };
  }

  if (state.queue.length > 0) {
    return {
      status: "sync_pending",
      assignmentId: state.handoff?.assignmentId ?? activeCall?.assignmentId ?? null,
      contactId: state.handoff?.contactId ?? activeCall?.contactId ?? null,
      phone: state.handoff?.phone ?? activeCall?.phone ?? null,
      updatedAt: state.sync.lastSyncAt,
    };
  }

  if (activeCall?.phase === "ended") {
    return {
      status: "wrap_up",
      assignmentId: activeCall.assignmentId,
      contactId: activeCall.contactId,
      phone: activeCall.phone,
      updatedAt: activeCall.endedAt ?? activeCall.startedAt,
    };
  }

  if (state.handoff) {
    return {
      status: "ready",
      assignmentId: state.handoff.assignmentId,
      contactId: state.handoff.contactId,
      phone: state.handoff.phone,
      updatedAt: state.handoff.receivedAt,
    };
  }

  return {
    status: "idle",
    assignmentId: null,
    contactId: null,
    phone: null,
    updatedAt: state.sync.lastSyncAt,
  };
}
