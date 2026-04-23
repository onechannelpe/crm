import { Show, createEffect, createMemo } from "solid-js";

import {
  addLeadNote,
  recordLeadCall,
} from "~/actions/pipeline/commands/interactions";
import type { LeadAvailableAction } from "~/server/pipeline/application/contracts/lead-available-action";

import {
  deriveInteractionAvailability,
  resolveInteractionMode,
} from "./availability";
import { InteractionForm } from "./interaction-form";
import { createInteractionState } from "./state";

import styles from "../lead-detail-overview.module.css";

export function InteractionsPanel(props: {
  leadId: string;
  availableActions: LeadAvailableAction[];
  onChanged?: () => void;
}) {
  const availability = createMemo(() =>
    deriveInteractionAvailability(props.availableActions),
  );
  const state = createInteractionState("call");

  createEffect(() => {
    const nextMode = resolveInteractionMode(availability(), state.mode());
    if (nextMode && nextMode !== state.mode()) {
      state.setMode(nextMode);
    }
  });

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
    <Show when={availability().visibleModes.length > 0}>
      <section class={styles.section}>
        <div class={styles.sectionTitle}>Registrar interaccion</div>
        <InteractionForm
          availability={availability()}
          state={state}
          onSubmit={() => void handleSubmit()}
        />
      </section>
    </Show>
  );
}
