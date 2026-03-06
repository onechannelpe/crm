import type { ExecutiveStateSnapshot, ExtensionState } from "./model";

export type RuntimeMessage =
  | {
      type: "state.get";
    }
  | {
      type: "call.start";
      assignmentId?: number;
      contactId?: number;
      phone?: string;
    }
  | {
      type: "call.connected";
    }
  | {
      type: "call.end";
      outcome?: string;
      notes?: string;
    }
  | {
      type: "recording.start";
      tabId: number;
    }
  | {
      type: "recording.stop";
    }
  | {
      type: "recording.chunk";
      sessionId: string;
      chunkId: string;
      mimeType: string;
      dataBase64: string;
      durationMs: number;
      createdAt: number;
    }
  | {
      type: "recording.completed";
      sessionId: string;
      createdAt: number;
    }
  | {
      type: "sync.flush";
    }
  | {
      type: "sync.configure";
      apiBaseUrl: string;
      sessionToken: string;
      refreshToken: string;
    };

export type ExternalRuntimeMessage =
  | {
      type: "state.get";
    }
  | {
      type: "assignment.handoff";
      token: string;
    };

export type RuntimeResponse =
  | {
      ok: true;
      state: ExtensionState;
      executiveState: ExecutiveStateSnapshot;
    }
  | {
      ok: false;
      error: string;
      state?: ExtensionState;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  if (!isObject(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case "state.get":
    case "call.connected":
    case "recording.stop":
    case "sync.flush":
      return true;
    case "call.start":
      return (
        (value.assignmentId === undefined || typeof value.assignmentId === "number") &&
        (value.contactId === undefined || typeof value.contactId === "number") &&
        (value.phone === undefined || typeof value.phone === "string")
      );
    case "call.end":
      return (
        (value.outcome === undefined || typeof value.outcome === "string") &&
        (value.notes === undefined || typeof value.notes === "string")
      );
    case "recording.start":
      return typeof value.tabId === "number";
    case "recording.chunk":
      return (
        typeof value.sessionId === "string" &&
        typeof value.chunkId === "string" &&
        typeof value.mimeType === "string" &&
        typeof value.dataBase64 === "string" &&
        typeof value.durationMs === "number" &&
        typeof value.createdAt === "number"
      );
    case "recording.completed":
      return (
        typeof value.sessionId === "string" &&
        typeof value.createdAt === "number"
      );
    case "sync.configure":
      return (
        typeof value.apiBaseUrl === "string" &&
        typeof value.sessionToken === "string" &&
        typeof value.refreshToken === "string"
      );
    default:
      return false;
  }
}

export function isExternalRuntimeMessage(value: unknown): value is ExternalRuntimeMessage {
  if (!isObject(value) || typeof value.type !== "string") {
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

export function isRuntimeResponse(value: unknown): value is RuntimeResponse {
  if (!isObject(value) || typeof value.ok !== "boolean") {
    return false;
  }

  if (value.ok) {
    return (
      isObject(value.state) &&
      value.state.schemaVersion === 1 &&
      isObject(value.executiveState) &&
      typeof value.executiveState.presenceStatus === "string" &&
      typeof value.executiveState.syncHealth === "string"
    );
  }

  return typeof value.error === "string";
}
