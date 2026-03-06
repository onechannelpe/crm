import {
  isRuntimeMessage,
  type RuntimeMessage,
  type RuntimeResponse,
} from "@/src/domain/messages";
import type { CallSession, ExtensionState, QueueJob } from "@/src/domain/model";
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
import { sendSyncJob } from "@/src/services/sync";

const ALARM_SYNC = "crm.sync" as const;

function createCallSession(message: Extract<RuntimeMessage, { type: "call.start" }>): CallSession {
  return {
    sessionId: crypto.randomUUID(),
    assignmentId: message.assignmentId,
    contactId: message.contactId,
    phone: message.phone,
    startedAt: Date.now(),
    connectedAt: null,
    endedAt: null,
    phase: "dialing",
    outcome: null,
    notes: null,
  };
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

function assertNever(value: never): never {
  throw new Error(`unhandled message type: ${JSON.stringify(value)}`);
}

async function flushQueue(state: ExtensionState): Promise<ExtensionState> {
  const due = dueJobs(state.queue);
  if (due.length === 0) return state;

  let next = state;

  for (const job of due) {
    let result: Awaited<ReturnType<typeof sendSyncJob>>;
    try {
      const sendableJob = await withHydratedPayload(job);
      result = await sendSyncJob(next.syncConfig, sendableJob);
    } catch (error: unknown) {
      result = {
        ok: false,
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
      return { ok: true, state: current };
    }
    case "call.start": {
      if (current.currentCall && current.currentCall.phase !== "ended") {
        return { ok: false, error: "a call is already active", state: current };
      }

      const now = Date.now();
      const session = createCallSession(message);
      let queue = enqueueJob(current.queue, "call.lifecycle", {
        event: "started",
        sessionId: session.sessionId,
        assignmentId: session.assignmentId,
        contactId: session.contactId,
        phone: session.phone,
        at: now,
      });

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
      return { ok: true, state: next };
    }
    case "call.connected": {
      try {
        const call = ensureCurrentCall(current);
        if (call.phase !== "dialing" || call.connectedAt) {
          return { ok: false, error: "call cannot be connected from current state", state: current };
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

        await writeState(next);
        return { ok: true, state: next };
      } catch (error: unknown) {
        return {
          ok: false,
          error: asErrorMessage(error),
          state: current,
        };
      }
    }
    case "call.end": {
      try {
        const call = ensureCurrentCall(current);
        if (call.phase !== "dialing" && call.phase !== "active") {
          return { ok: false, error: "call cannot be ended from current state", state: current };
        }

        const endedAt = Date.now();
        const callDurationSeconds = call.connectedAt
          ? Math.max(0, Math.round((endedAt - call.connectedAt) / 1000))
          : 0;

        const completedCall: CallSession = {
          ...call,
          phase: "ended",
          endedAt,
          outcome: message.outcome,
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

        await writeState(next);
        return { ok: true, state: next };
      } catch (error: unknown) {
        return { ok: false, error: asErrorMessage(error), state: current };
      }
    }
    case "recording.start": {
      try {
        if (current.recording.phase !== "idle" && current.recording.phase !== "error") {
          return {
            ok: false,
            error: "recording cannot be started from current state",
            state: current,
          };
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
        return { ok: true, state: next };
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
        return { ok: false, error: asErrorMessage(error), state: next };
      }
    }
    case "recording.stop": {
      if (current.recording.phase === "idle") {
        return { ok: true, state: current };
      }

      if (current.recording.phase !== "recording" && current.recording.phase !== "starting") {
        return {
          ok: false,
          error: "recording cannot be stopped from current state",
          state: current,
        };
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
        return { ok: true, state: next };
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
        return { ok: false, error: asErrorMessage(error), state: next };
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
      return { ok: true, state: next };
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
      return { ok: true, state: next };
    }
    case "sync.flush": {
      const next = await flushQueue(current);
      return { ok: true, state: next };
    }
    case "sync.configure": {
      const next: ExtensionState = {
        ...current,
        syncConfig: {
          apiBaseUrl: message.apiBaseUrl,
          authToken: message.authToken,
        },
      };

      await writeState(next);
      return { ok: true, state: next };
    }
  }

  return assertNever(message);
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
      return Promise.resolve({
        ok: false,
        error: "invalid message payload",
      } satisfies RuntimeResponse);
    }

    return handleMessage(message);
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
