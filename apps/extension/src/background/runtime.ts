import {
  isRuntimeMessage,
  isExternalRuntimeMessage,
  type ExternalRuntimeMessage,
  type RuntimeMessage,
  type RuntimeResponse,
} from "@/src/domain/messages";
import {
  getExecutiveState,
  type AssignmentHandoff,
  type CallSession,
  type ExtensionState,
  type QueueJob,
} from "@/src/domain/model";
import { verifyExternalHandoff } from "@/src/services/external-auth";
import {
  deleteLargePayload,
  readLargePayload,
  saveLargePayload,
} from "@/src/services/journal";
import { appendJob, createJob, dueJobs, enqueueJob, markFailed } from "@/src/services/queue";
import {
  closeOffscreenDocument,
  ensureOffscreenDocument,
} from "@/src/services/offscreen";
import { readState, writeState } from "@/src/services/storage";
import { refreshSyncSession, sendSyncJob } from "@/src/services/sync";

const ALARM_SYNC = "crm.sync" as const;

function toSuccessResponse(state: ExtensionState): RuntimeResponse {
  return {
    ok: true,
    state,
    executiveState: getExecutiveState(state),
  };
}

function toErrorResponse(error: string, state?: ExtensionState): RuntimeResponse {
  return { ok: false, error, state };
}

function createCallSession(handoff: AssignmentHandoff): CallSession {
  return {
    sessionId: crypto.randomUUID(),
    assignmentId: handoff.assignmentId,
    contactId: handoff.contactId,
    phone: handoff.phone,
    startedAt: Date.now(),
    connectedAt: null,
    endedAt: null,
    phase: "dialing",
    outcome: null,
    notes: null,
  };
}

function resolveCallHandoff(
  state: ExtensionState,
  message: Extract<RuntimeMessage, { type: "call.start" }>,
): AssignmentHandoff {
  if (
    typeof message.assignmentId === "number" &&
    typeof message.contactId === "number" &&
    typeof message.phone === "string"
  ) {
    return {
      assignmentId: message.assignmentId,
      contactId: message.contactId,
      phone: message.phone,
      clientName: state.handoff?.clientName ?? null,
      organizationLabel: state.handoff?.organizationLabel ?? null,
      receivedAt: state.handoff?.receivedAt ?? Date.now(),
    };
  }

  return ensureHandoff(state);
}

function asErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "unknown error";
}

function ensureCurrentCall(state: ExtensionState): CallSession {
  if (!state.currentCall) {
    throw new Error("no active call session");
  }

  return state.currentCall;
}

function ensureRecordableCall(state: ExtensionState): CallSession {
  const call = ensureCurrentCall(state);
  if (call.phase === "ended") {
    throw new Error("cannot record an ended call");
  }
  return call;
}

function ensureHandoff(state: ExtensionState): AssignmentHandoff {
  if (!state.handoff) {
    throw new Error("no assigned client handoff");
  }

  return state.handoff;
}

function isOffscreenControlResponse(
  value: unknown,
): value is { ok: boolean; error?: string } {
  if (typeof value !== "object" || value === null) return false;
  const maybeResponse = value as Record<string, unknown>;
  if (typeof maybeResponse.ok !== "boolean") return false;
  if (maybeResponse.error !== undefined && typeof maybeResponse.error !== "string") {
    return false;
  }
  return true;
}

function withoutJob(queue: QueueJob[], id: string): QueueJob[] {
  return queue.filter((job) => job.id !== id);
}

function withReplacedJob(queue: QueueJob[], next: QueueJob): QueueJob[] {
  return queue.map((job) => (job.id === next.id ? next : job));
}

function withoutSyncCredentials(state: ExtensionState): ExtensionState {
  return {
    ...state,
    syncConfig: {
      ...state.syncConfig,
      sessionToken: null,
      refreshToken: null,
    },
  };
}

function withClearedSyncError(state: ExtensionState): ExtensionState {
  return {
    ...state,
    sync: {
      ...state.sync,
      lastSyncError: null,
    },
  };
}

function assertNever(value: never): never {
  throw new Error(`unhandled message type: ${JSON.stringify(value)}`);
}

function enqueueExecutiveStatus(
  state: ExtensionState,
  status: ReturnType<typeof getExecutiveState>["status"],
  updatedAt: number,
): QueueJob[] {
  return enqueueJob(state.queue, "executive.status", {
    status,
    assignmentId: state.handoff?.assignmentId ?? state.currentCall?.assignmentId ?? null,
    contactId: state.handoff?.contactId ?? state.currentCall?.contactId ?? null,
    callSessionId: state.currentCall?.sessionId ?? null,
    updatedAt,
  });
}

async function flushQueue(
  state: ExtensionState,
  force = false,
): Promise<ExtensionState> {
  const due = force ? state.queue : dueJobs(state.queue);
  if (due.length === 0) return state;

  let next = state;

  for (const job of due) {
    let result: Awaited<ReturnType<typeof sendSyncJob>>;
    try {
      const sendableJob = await withHydratedPayload(job);
      result = await sendSyncJob(next.syncConfig, sendableJob);
      if (!result.ok && result.reason === "unauthorized") {
        const refreshed = await refreshSyncSession(
          next.syncConfig,
          next.installationId,
        );
        if (!refreshed.ok) {
          if (refreshed.reason === "unauthorized") {
            next = withoutSyncCredentials(next);
          }
          result = {
            ok: false,
            reason: "failed",
            error: refreshed.error,
          };
        } else {
          next = {
            ...next,
            syncConfig: {
              ...next.syncConfig,
              sessionToken: refreshed.sessionToken,
              refreshToken: refreshed.refreshToken,
            },
          };
          result = await sendSyncJob(next.syncConfig, sendableJob);
        }
      }
    } catch (error: unknown) {
      result = {
        ok: false,
        reason: "failed",
        error: asErrorMessage(error),
      };
    }

    if (result.ok) {
      next = {
        ...next,
        queue: withoutJob(next.queue, job.id),
        sync: {
          lastSyncAt: Date.now(),
          lastSyncError: null,
        },
      };
      if (job.type === "recording.chunk") {
        await deleteLargePayload(job.id).catch(() => undefined);
      }
      continue;
    }

    next = {
      ...next,
      queue: withReplacedJob(next.queue, markFailed(job, result.error)),
      sync: {
        ...next.sync,
        lastSyncError: result.error,
      },
    };
  }

  await writeState(next);
  return next;
}

async function handleMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  const current = await readState();

  switch (message.type) {
    case "state.get": {
      return toSuccessResponse(current);
    }
    case "call.start": {
      if (current.currentCall && current.currentCall.phase !== "ended") {
        return toErrorResponse("a call is already active", current);
      }

      const handoff = resolveCallHandoff(current, message);
      const now = Date.now();
      const session = createCallSession(handoff);
      let queue = enqueueJob(current.queue, "call.lifecycle", {
        event: "started",
        sessionId: session.sessionId,
        assignmentId: session.assignmentId,
        contactId: session.contactId,
        phone: session.phone,
        at: now,
      });
      queue = appendJob(
        queue,
        createJob("executive.status", {
          status: "dialing",
          assignmentId: session.assignmentId,
          contactId: session.contactId,
          callSessionId: session.sessionId,
          updatedAt: now,
        }),
      );

      if (current.previousCallEndedAt) {
        const idleSeconds = Math.round((now - current.previousCallEndedAt) / 1000);
        queue = enqueueJob(queue, "call.metric", {
          event: "between_calls",
          sessionId: session.sessionId,
          idleSeconds,
          fromEndedAt: current.previousCallEndedAt,
          startedAt: now,
        });
      }

      const next: ExtensionState = {
        ...current,
        currentCall: session,
        queue,
      };

      await writeState(next);
      void flushQueue(next).catch(() => undefined);
      return toSuccessResponse(next);
    }
    case "call.connected": {
      try {
        const call = ensureCurrentCall(current);
        if (call.phase !== "dialing" || call.connectedAt) {
          return toErrorResponse("call cannot be connected from current state", current);
        }

        const connectedAt = Date.now();
        const next: ExtensionState = {
          ...current,
          currentCall: {
            ...call,
            connectedAt,
            phase: "active",
          },
          queue: enqueueJob(current.queue, "call.lifecycle", {
            event: "connected",
            sessionId: call.sessionId,
            at: connectedAt,
          }),
        };
        next.queue = appendJob(
          next.queue,
          createJob("executive.status", {
            status: "active",
            assignmentId: call.assignmentId,
            contactId: call.contactId,
            callSessionId: call.sessionId,
            updatedAt: connectedAt,
          }),
        );

        await writeState(next);
        void flushQueue(next).catch(() => undefined);
        return toSuccessResponse(next);
      } catch (error: unknown) {
        return toErrorResponse(asErrorMessage(error), current);
      }
    }
    case "call.end": {
      try {
        const call = ensureCurrentCall(current);
        if (call.phase !== "dialing" && call.phase !== "active") {
          return toErrorResponse("call cannot be ended from current state", current);
        }

        const endedAt = Date.now();
        const callDurationSeconds = call.connectedAt
          ? Math.max(0, Math.round((endedAt - call.connectedAt) / 1000))
          : 0;

        const completedCall: CallSession = {
          ...call,
          phase: "ended",
          endedAt,
          outcome: message.outcome ?? null,
          notes: message.notes ?? null,
        };

        const next: ExtensionState = {
          ...current,
          currentCall: completedCall,
          previousCallEndedAt: endedAt,
          queue: enqueueJob(
            enqueueJob(current.queue, "call.lifecycle", {
              event: "ended",
              sessionId: call.sessionId,
              outcome: message.outcome,
              notes: message.notes ?? null,
              at: endedAt,
            }),
            "call.metric",
            {
              event: "duration",
              sessionId: call.sessionId,
              durationSeconds: callDurationSeconds,
              connectedAt: call.connectedAt,
              endedAt,
            },
          ),
        };
        next.queue = appendJob(
          next.queue,
          createJob("executive.status", {
            status: "wrap_up",
            assignmentId: call.assignmentId,
            contactId: call.contactId,
            callSessionId: call.sessionId,
            updatedAt: endedAt,
          }),
        );

        await writeState(next);
        void flushQueue(next).catch(() => undefined);
        return toSuccessResponse(next);
      } catch (error: unknown) {
        return toErrorResponse(asErrorMessage(error), current);
      }
    }
    case "recording.start": {
      try {
        if (current.recording.phase !== "idle" && current.recording.phase !== "error") {
          return toErrorResponse("recording cannot be started from current state", current);
        }

        const call = ensureRecordableCall(current);
        const startingState: ExtensionState = {
          ...current,
          recording: {
            ...current.recording,
            phase: "starting",
            error: null,
            stoppedAt: null,
          },
        };
        await writeState(startingState);
        await ensureOffscreenDocument();

        const streamId = await chrome.tabCapture.getMediaStreamId({
          targetTabId: message.tabId,
        });

        const response = await browser.runtime.sendMessage({
          type: "offscreen.recording.start",
          sessionId: call.sessionId,
          streamId,
        });
        if (!isOffscreenControlResponse(response) || !response.ok) {
          throw new Error(
            isOffscreenControlResponse(response) ? response.error ?? "offscreen start failed" : "invalid offscreen response",
          );
        }

        const next: ExtensionState = {
          ...startingState,
          recording: {
            phase: "recording",
            streamId,
            startedAt: Date.now(),
            stoppedAt: null,
            error: null,
            chunkCount: 0,
          },
        };

        await writeState(next);
        return toSuccessResponse(next);
      } catch (error: unknown) {
        const next: ExtensionState = {
          ...current,
          recording: {
            ...current.recording,
            phase: "error",
            error: asErrorMessage(error),
          },
        };
        await writeState(next);
        return toErrorResponse(asErrorMessage(error), next);
      }
    }
    case "recording.stop": {
      if (current.recording.phase === "idle") {
        return toSuccessResponse(current);
      }

      if (current.recording.phase !== "recording" && current.recording.phase !== "starting") {
        return toErrorResponse("recording cannot be stopped from current state", current);
      }

      try {
        const stoppingState: ExtensionState = {
          ...current,
          recording: {
            ...current.recording,
            phase: "stopping",
            error: null,
          },
        };
        await writeState(stoppingState);

        const response = await browser.runtime.sendMessage({
          type: "offscreen.recording.stop",
        });
        if (!isOffscreenControlResponse(response) || !response.ok) {
          throw new Error(
            isOffscreenControlResponse(response) ? response.error ?? "offscreen stop failed" : "invalid offscreen response",
          );
        }

        await closeOffscreenDocument();

        const next: ExtensionState = {
          ...stoppingState,
          recording: {
            ...stoppingState.recording,
            phase: "idle",
            stoppedAt: Date.now(),
            streamId: null,
          },
        };

        await writeState(next);
        return toSuccessResponse(next);
      } catch (error: unknown) {
        const next: ExtensionState = {
          ...current,
          recording: {
            ...current.recording,
            phase: "error",
            error: asErrorMessage(error),
          },
        };
        await writeState(next);
        return toErrorResponse(asErrorMessage(error), next);
      }
    }
    case "recording.chunk": {
      const chunkPayload = {
        sessionId: message.sessionId,
        chunkId: message.chunkId,
        mimeType: message.mimeType,
        dataBase64: message.dataBase64,
        durationMs: message.durationMs,
        createdAt: message.createdAt,
      } satisfies Record<string, unknown>;
      const queueJob = createJob("recording.chunk", {
        sessionId: message.sessionId,
        chunkId: message.chunkId,
        mimeType: message.mimeType,
        durationMs: message.durationMs,
        createdAt: message.createdAt,
        payloadStorage: "indexeddb",
      });
      await saveLargePayload(queueJob.id, chunkPayload);

      const next: ExtensionState = {
        ...current,
        recording: {
          ...current.recording,
          chunkCount: current.recording.chunkCount + 1,
        },
        queue: appendJob(current.queue, queueJob),
      };

      await writeState(next);
      return toSuccessResponse(next);
    }
    case "recording.completed": {
      const next: ExtensionState = {
        ...current,
        queue: enqueueJob(current.queue, "recording.completed", {
          sessionId: message.sessionId,
          createdAt: message.createdAt,
        }),
      };
      await writeState(next);
      return toSuccessResponse(next);
    }
    case "sync.flush": {
      const next = await flushQueue(current, true);
      return toSuccessResponse(next);
    }
    case "sync.configure": {
      const next: ExtensionState = {
        ...current,
        syncConfig: {
          apiBaseUrl: message.apiBaseUrl,
          sessionToken: message.sessionToken,
          refreshToken: message.refreshToken,
        },
      };

      const cleared = withClearedSyncError(next);
      await writeState(cleared);
      return toSuccessResponse(cleared);
    }
  }

  return assertNever(message);
}

async function handleExternalRuntimeMessage(
  message: ExternalRuntimeMessage,
  sender: chrome.runtime.MessageSender,
): Promise<RuntimeResponse> {
  const current = await readState();

  switch (message.type) {
    case "state.get":
      return toSuccessResponse(current);
    case "assignment.handoff": {
      const verified = await verifyExternalHandoff({
        token: message.token,
        sender,
        installationId: current.installationId,
      });
      if (
        current.currentCall &&
        current.currentCall.phase !== "ended" &&
        current.currentCall.assignmentId !== verified.handoff.assignmentId
      ) {
        return toErrorResponse("cannot replace handoff during an active call", current);
      }

      const receivedAt = verified.handoff.receivedAt;
      const next: ExtensionState = {
        ...current,
        handoff: verified.handoff,
        syncConfig: verified.syncConfig,
        sync: {
          ...current.sync,
          lastSyncError: null,
        },
        queue: enqueueExecutiveStatus(
          {
            ...current,
            handoff: verified.handoff,
            syncConfig: verified.syncConfig,
            sync: {
              ...current.sync,
              lastSyncError: null,
            },
          },
          "ready",
          receivedAt,
        ),
      };
      await writeState(next);
      void flushQueue(next).catch(() => undefined);
      return toSuccessResponse(next);
    }
  }
}

async function withHydratedPayload(job: QueueJob): Promise<QueueJob> {
  if (job.type !== "recording.chunk") {
    return job;
  }

  if (job.payload.payloadStorage !== "indexeddb") {
    return job;
  }

  const payload = await readLargePayload(job.id);
  if (!payload) {
    throw new Error(`missing payload for recording chunk job ${job.id}`);
  }

  return {
    ...job,
    payload,
  };
}

async function ensureAlarms(): Promise<void> {
  const syncAlarm = await browser.alarms.get(ALARM_SYNC);
  if (!syncAlarm) {
    await browser.alarms.create(ALARM_SYNC, { periodInMinutes: 1 });
  }
}

export function registerRuntime(): void {
  browser.runtime.onInstalled.addListener(async () => {
    await readState();
    await ensureAlarms();
  });

  browser.runtime.onStartup.addListener(async () => {
    await ensureAlarms();
  });

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isRuntimeMessage(message)) {
      return Promise.resolve(toErrorResponse("invalid message payload"));
    }

    return handleMessage(message);
  });

  browser.runtime.onMessageExternal.addListener((message: unknown, sender) => {
    if (!isExternalRuntimeMessage(message)) {
      return Promise.resolve(toErrorResponse("invalid external message payload"));
    }

    return handleExternalRuntimeMessage(message, sender);
  });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_SYNC) {
      const state = await readState();
      await flushQueue(state);
    }
  });

  if (chrome.sidePanel?.setPanelBehavior) {
    void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }

  void ensureAlarms();
}
