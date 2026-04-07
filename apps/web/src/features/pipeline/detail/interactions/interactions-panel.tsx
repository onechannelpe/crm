import { Show } from "solid-js";

import {
  addLeadNote,
  recordLeadCall,
} from "~/actions/pipeline/commands/interactions";
import type { LeadAvailableAction } from "~/server/pipeline/application/queries/views/lead-detail-view";

import { InteractionForm } from "./interaction-form";
import { createInteractionState } from "./state";

import styles from "../lead-detail-overview.module.css";

export function InteractionsPanel(props: {
  leadId: number;
  availableActions: LeadAvailableAction[];
  onChanged?: () => void;
}) {
  const state = createInteractionState(() => props.availableActions);

  async function handleSubmit() {
    state.setError(null);
    state.setSubmitting(true);

    try {
      if (state.mode() === "call") {
        await recordLeadCall({
          leadId: props.leadId,
          outcome: state.callOutcome(),
          notes: state.body(),
        });
      } else {
        await addLeadNote({
          leadId: props.leadId,
          body: state.body(),
        });
      }

      state.clearDraft();
      props.onChanged?.();
    } catch (error) {
      state.setError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la interaccion.",
      );
    } finally {
      state.setSubmitting(false);
    }
  }

  return (
    <Show when={state.canLogCall() || state.canAddNote()}>
      <section class={styles.section}>
        <div class={styles.sectionTitle}>Registrar interaccion</div>
        <InteractionForm state={state} onSubmit={() => void handleSubmit()} />
      </section>
    </Show>
  );
}
