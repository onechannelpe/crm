import { createSignal } from "solid-js";

import type { LeadCallOutcome } from "~/lib/pipeline/lead-values";
import type { LeadAvailableAction } from "~/server/pipeline/application/queries/views/lead-detail-view";

export type InteractionMode = "call" | "note";

const INTERACTION_MODES = ["call", "note"] as const;

export function createInteractionState(
  availableActions: () => LeadAvailableAction[],
) {
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

export type InteractionState = ReturnType<typeof createInteractionState>;
