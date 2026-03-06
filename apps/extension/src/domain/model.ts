export const STORAGE_KEY = "crm_extension_state_v1" as const;

export type CallPhase = "dialing" | "active" | "ended";

export type RecordingPhase = "idle" | "starting" | "recording" | "stopping" | "error";

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

export interface ExtensionState {
  schemaVersion: 1;
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
