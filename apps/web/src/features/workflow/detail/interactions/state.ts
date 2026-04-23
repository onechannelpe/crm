import { createSignal } from "solid-js";

import type { LeadCallOutcome } from "~/pipeline/contracts/lead-schema";

export type InteractionMode = "call" | "note";

const INTERACTION_MODES = ["call", "note"] as const;

export function isInteractionMode(value: string): value is InteractionMode {
  return INTERACTION_MODES.some((mode) => mode === value);
}

export interface InteractionState {
  mode: () => InteractionMode;
  setMode: (value: InteractionMode) => void;
  callOutcome: () => LeadCallOutcome;
  setCallOutcome: (value: LeadCallOutcome) => void;
  body: () => string;
  setBody: (value: string) => void;
  error: () => string | null;
  setError: (value: string | null) => void;
  submitting: () => boolean;
  setSubmitting: (value: boolean) => void;
  clearDraft: () => void;
}

export function createInteractionState(
  initialMode: InteractionMode,
): InteractionState {
  const [mode, setMode] = createSignal<InteractionMode>(initialMode);
  const [callOutcome, setCallOutcome] =
    createSignal<LeadCallOutcome>("answered");
  const [body, setBody] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  function clearDraft() {
    setBody("");
    setError(null);
  }

  return {
    mode,
    setMode,
    callOutcome,
    setCallOutcome,
    body,
    setBody,
    error,
    setError,
    submitting,
    setSubmitting,
    clearDraft,
  };
}
