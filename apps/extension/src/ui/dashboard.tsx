import { createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";

import type { ExtensionState } from "@/src/domain/model";
import {
  configureSync,
  connectCall,
  endCall,
  flushQueue,
  getState,
  isSuccessfulResponse,
  startCall,
  startRecording,
  stopRecording,
} from "@/src/client/runtime-client";

import "./dashboard.css";

interface DashboardProps {
  surface: "popup" | "sidepanel";
}

function formatTimestamp(value: number | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString();
}

function formatDurationSeconds(state: ExtensionState | null): string {
  if (!state?.currentCall) return "0s";
  const session = state.currentCall;

  if (!session.connectedAt) return "0s";
  const endAt = session.endedAt ?? Date.now();
  const seconds = Math.max(0, Math.round((endAt - session.connectedAt) / 1000));
  return `${seconds}s`;
}

function classForSurface(surface: DashboardProps["surface"]): string {
  return surface === "popup" ? "surface-popup" : "surface-sidepanel";
}

export function Dashboard(props: DashboardProps) {
  const [state, setState] = createSignal<ExtensionState | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [assignmentId, setAssignmentId] = createSignal("1001");
  const [contactId, setContactId] = createSignal("2001");
  const [phone, setPhone] = createSignal("+51999999999");
  const [outcome, setOutcome] = createSignal("no_answer");
  const [notes, setNotes] = createSignal("");
  const [tabId, setTabId] = createSignal("1");
  const [apiBaseUrl, setApiBaseUrl] = createSignal("");
  const [authToken, setAuthToken] = createSignal("");

  let intervalId: number | undefined;

  const refreshState = async () => {
    const response = await getState();
    if (!isSuccessfulResponse(response)) {
      setError(response.error);
      return;
    }

    setState(response.state);
    setError(null);
  };

  const run = async (task: () => Promise<{ ok: boolean; error?: string; state?: ExtensionState }>) => {
    const response = await task();
    if (!response.ok) {
      setError(response.error ?? "operation failed");
      if (response.state) {
        setState(response.state);
      }
      return;
    }

    setError(null);
    setState(response.state ?? null);
    await refreshState();
  };

  const createField = (
    label: string,
    value: string,
    onInput: JSX.EventHandler<HTMLInputElement, InputEvent>,
    type: "text" | "number" = "text",
  ) => (
    <label class="field">
      <span>{label}</span>
      <input type={type} value={value} onInput={onInput} />
    </label>
  );

  onMount(() => {
    void refreshState();
    intervalId = window.setInterval(() => {
      void refreshState();
    }, 2500);
  });

  onCleanup(() => {
    if (intervalId) {
      window.clearInterval(intervalId);
    }
  });

  return (
    <main class={`dashboard ${classForSurface(props.surface)}`}>
      <header class="header">
        <p class="eyebrow">CRM extension</p>
        <h1>VoIP persistence worker</h1>
        <p class="muted">Resilient session state, recording queue, and sync telemetry.</p>
      </header>

      <Show when={error()}>
        <p class="error">{error()}</p>
      </Show>

      <section class="card">
        <h2>Current state</h2>
        <div class="stats-grid">
          <p>
            Call phase
            <strong>{state()?.currentCall?.phase ?? "idle"}</strong>
          </p>
          <p>
            Recording
            <strong>{state()?.recording.phase ?? "idle"}</strong>
          </p>
          <p>
            Queue jobs
            <strong>{state()?.queue.length ?? 0}</strong>
          </p>
          <p>
            Last sync
            <strong>{formatTimestamp(state()?.sync.lastSyncAt ?? null)}</strong>
          </p>
          <p>
            Call duration
            <strong>{formatDurationSeconds(state())}</strong>
          </p>
          <p>
            Recorded chunks
            <strong>{state()?.recording.chunkCount ?? 0}</strong>
          </p>
        </div>
      </section>

      <section class="card">
        <h2>Call controls</h2>
        <div class="field-grid">
          {createField("Assignment", assignmentId(), (event) => setAssignmentId(event.currentTarget.value), "number")}
          {createField("Contact", contactId(), (event) => setContactId(event.currentTarget.value), "number")}
          {createField("Phone", phone(), (event) => setPhone(event.currentTarget.value))}
        </div>

        <div class="button-row">
          <button
            onClick={() =>
              void run(() =>
                startCall({
                  assignmentId: Number(assignmentId()),
                  contactId: Number(contactId()),
                  phone: phone(),
                }),
              )
            }
          >
            Start call
          </button>
          <button class="secondary" onClick={() => void run(() => connectCall())}>
            Mark connected
          </button>
        </div>

        <div class="field-grid">
          <label class="field">
            <span>Outcome</span>
            <select value={outcome()} onChange={(event) => setOutcome(event.currentTarget.value)}>
              <option value="sale_made">Sale made</option>
              <option value="no_answer">No answer</option>
              <option value="not_interested">Not interested</option>
              <option value="follow_up_later">Follow up later</option>
            </select>
          </label>
          <label class="field field-grow">
            <span>Notes</span>
            <input value={notes()} onInput={(event) => setNotes(event.currentTarget.value)} />
          </label>
        </div>

        <div class="button-row">
          <button class="secondary" onClick={() => void run(() => endCall(outcome(), notes()))}>
            End call
          </button>
        </div>
      </section>

      <section class="card">
        <h2>Recording controls</h2>
        <div class="field-grid">
          {createField("Tab ID", tabId(), (event) => setTabId(event.currentTarget.value), "number")}
        </div>
        <div class="button-row">
          <button class="secondary" onClick={() => void run(() => startRecording(Number(tabId())))}>
            Start recording
          </button>
          <button class="secondary" onClick={() => void run(() => stopRecording())}>
            Stop recording
          </button>
        </div>
      </section>

      <section class="card">
        <h2>Sync controls</h2>
        <div class="field-grid">
          {createField("API base URL", apiBaseUrl(), (event) => setApiBaseUrl(event.currentTarget.value))}
          {createField("Auth token", authToken(), (event) => setAuthToken(event.currentTarget.value))}
        </div>
        <div class="button-row">
          <button
            class="secondary"
            onClick={() =>
              void run(() =>
                configureSync({
                  apiBaseUrl: apiBaseUrl(),
                  authToken: authToken(),
                }),
              )
            }
          >
            Save sync config
          </button>
          <button class="secondary" onClick={() => void run(() => flushQueue())}>
            Flush queue
          </button>
        </div>
      </section>
    </main>
  );
}
