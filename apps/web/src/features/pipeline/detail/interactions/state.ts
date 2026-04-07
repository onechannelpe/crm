import { createSignal } from "solid-js";

import type {
  LeadAvailableAction,
  LeadCallOutcome,
} from "~/actions/pipeline/contracts";

export type InteractionMode = "call" | "note";

export interface InteractionState {
  mode: () => InteractionMode;
  setMode: (value: string) => void;
  callOutcome: () => LeadCallOutcome;
  setCallOutcome: (value: LeadCallOutcome) => void;
  body: () => string;
  setBody: (value: string) => void;
  error: () => string | null;
  setError: (value: string | null) => void;
  submitting: () => boolean;
  setSubmitting: (value: boolean) => void;
  canLogCall: () => boolean;
  canAddNote: () => boolean;
  visibleModes: () => readonly InteractionMode[];
  clearDraft: () => void;
}

const INTERACTION_MODES = ["call", "note"] as const;

export function createInteractionState(
  availableActions: () => LeadAvailableAction[],
): InteractionState {
  const [mode, setMode] = createSignal<InteractionMode>("call");
  const [callOutcome, setCallOutcome] =
    createSignal<LeadCallOutcome>("answered");
  const [body, setBody] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  const canLogCall = () => availableActions().includes("log-call");
  const canAddNote = () => availableActions().includes("add-note");
  const visibleModes = () =>
    INTERACTION_MODES.filter((value) =>
      value === "call" ? canLogCall() : canAddNote(),
    );

  function selectMode(rawValue: string) {
    const nextMode = visibleModes().find((value) => value === rawValue);
    if (nextMode) {
      setMode(nextMode);
    }
  }

  function clearDraft() {
    setBody("");
    setError(null);
  }

  return {
    mode,
    setMode: selectMode,
    callOutcome,
    setCallOutcome,
    body,
    setBody,
    error,
    setError,
    submitting,
    setSubmitting,
    canLogCall,
    canAddNote,
    visibleModes,
    clearDraft,
  };
}
